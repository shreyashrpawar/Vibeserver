package main

import (
	"bytes"
	"embed"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/creack/pty"
	"github.com/glebarez/sqlite"
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/golang-jwt/jwt/v5"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
	"github.com/shirou/gopsutil/v3/process"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// User model
type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Username  string         `gorm:"unique" json:"username"`
	Email     string         `gorm:"unique" json:"email"`
	Password  string         `json:"-"`
	Role      string         `json:"role"` // "admin" or "user"
	CreatedAt time.Time      `json:"created_at"`
	ExpiresAt *time.Time     `json:"expires_at"`
	Status    string         `json:"status"` // "active", "inactive"
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// ActivityLog
type ActivityLog struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	UserID            uint      `gorm:"index" json:"user_id"`
	User              User      `gorm:"foreignKey:UserID" json:"user"`
	Action            string    `gorm:"index" json:"action"` // e.g., "LOGIN", "FILE_WRITE"
	Target            string    `json:"target"`              // e.g., "/path/to/file"
	Details           string    `json:"details"`             // JSON or simple text
	TerminalSessionID *uint     `json:"terminal_session_id"` // Link to full session
	CreatedAt         time.Time `json:"created_at"`
}

// TerminalSession
type TerminalSession struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	Commands  string    `json:"commands"` // JSON list of commands
	Output    string    `json:"output"`   // Full output text
	CreatedAt time.Time `json:"created_at"`
	EndedAt   time.Time `json:"ended_at"`
}

// FileVersion
type FileVersion struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	LogID     uint      `gorm:"index" json:"log_id"`
	Path      string    `gorm:"index" json:"path"`
	Content   string    `json:"content"` // Store full content (snapshot)
	Size      int64     `json:"size"`
	CreatedAt time.Time `json:"created_at"`
}

// API keys for AI
type SystemSetting struct {
	Key   string `gorm:"primaryKey" json:"key"`
	Value string `json:"value"`
}

//go:embed all:out
var embedFrontend embed.FS

var DB *gorm.DB
var SecretKey = []byte("supersecretkey") // in production, use environment variable

func main() {
	var err error
	DB, err = gorm.Open(sqlite.Open("auth.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("failed to connect database")
	}

	// Migrate the schema
	DB.AutoMigrate(&User{}, &ActivityLog{}, &FileVersion{}, &TerminalSession{}, &SystemSetting{})

	// Seed Admin User
	seedAdmin()

	app := fiber.New()

	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000",
		AllowHeaders:     "Origin, Content-Type, Accept",
		AllowCredentials: true,
	}))

	// Routes
	api := app.Group("/api")
	api.Post("/login", Login)
	api.Post("/logout", Logout)
	api.Get("/me", AuthMiddleware, Me)              // Get current user details
	api.Post("/register", AuthMiddleware, Register) // Only logged in admins can register
	api.Put("/change-password", AuthMiddleware, ChangePassword)

	// User CRUD (Admin only)
	api.Get("/users", AuthMiddleware, AdminMiddleware, GetAllUsers)
	api.Put("/users/:id", AuthMiddleware, AdminMiddleware, UpdateUser)
	api.Delete("/users/:id", AuthMiddleware, AdminMiddleware, DeleteUser)

	// logs
	// logs
	api.Get("/logs", AuthMiddleware, GetLogs)
	api.Delete("/logs/:id", AuthMiddleware, AdminMiddleware, DeleteLog)
	api.Get("/files/history", AuthMiddleware, GetFileHistory)
	api.Get("/files/version/:id", AuthMiddleware, GetFileVersion)
	api.Get("/files/version/:id", AuthMiddleware, GetFileVersion)
	api.Get("/files/version/:id", AuthMiddleware, GetFileVersion)
	api.Get("/sessions/:id", AuthMiddleware, GetTerminalSession)

	// Settings & AI
	api.Get("/settings", AuthMiddleware, AdminMiddleware, GetSettings)
	api.Post("/settings", AuthMiddleware, AdminMiddleware, UpdateSettings)
	api.Post("/ai/chat", AuthMiddleware, ChatWithAI)

	// Monitor & Services
	api.Post("/monitor/kill/:pid", AuthMiddleware, AdminMiddleware, KillProcess)
	api.Get("/monitor/services", AuthMiddleware, GetServices)
	api.Post("/monitor/services/:name/:action", AuthMiddleware, AdminMiddleware, ManageService)

	// WebSockets
	// Protect WS
	app.Use("/ws", AuthMiddleware)

	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return c.SendStatus(fiber.StatusUpgradeRequired)
	})

	app.Get("/ws", websocket.New(handleWebSocket))

	// Serve Static Frontend (Embedded)
	app.Use("/", filesystem.New(filesystem.Config{
		Root:       http.FS(embedFrontend),
		PathPrefix: "out",
		Browse:     false,
		// SPA: If path looks like a route (no extension), skip static serving to let wildcard handle it
		Next: func(c *fiber.Ctx) bool {
			return !strings.Contains(c.Path(), ".")
		},
	}))

	// SPA Fallback: Any route not matched by API or Static files -> index.html
	app.Get("*", func(c *fiber.Ctx) error {
		// Verify if it's an API call to avoid returning html for 404 API
		if strings.HasPrefix(c.Path(), "/api/") {
			return c.SendStatus(fiber.StatusNotFound)
		}

		// Serve index.html from embedded FS
		content, err := embedFrontend.ReadFile("out/index.html")
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).SendString("Index not found")
		}
		c.Set("Content-Type", "text/html")
		return c.Send(content)
	})

	log.Fatal(app.Listen(":8080"))
}

// WebSocket Message Types
type WSMsg struct {
	Type string      `json:"type"` // "resize", "input", "monitor", "file_action"
	Data interface{} `json:"data"`
}

// === System Monitor & Process Management ===
func KillProcess(c *fiber.Ctx) error {
	pidStr := c.Params("pid")
	pid, err := strconv.Atoi(pidStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid PID"})
	}

	process, err := os.FindProcess(pid)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "Process not found"})
	}

	// Send SIGKILL
	if err := process.Kill(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Failed to kill process: " + err.Error()})
	}

	// Log Action
	claims := c.Locals("user").(jwt.MapClaims)
	userIdFloat, _ := claims["iss"].(float64)
	userID := uint(userIdFloat)

	DB.Create(&ActivityLog{
		UserID:    userID,
		Action:    "PROCESS_KILL",
		Target:    pidStr,
		Details:   "Killed process via Monitor",
		CreatedAt: time.Now(),
	})

	return c.JSON(fiber.Map{"message": "Process killed successfully"})

}

// === Service Manager ===

type ServiceStatus struct {
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	Status      string `json:"status"` // active, inactive
}

var trackedServices = []struct {
	Name        string
	DisplayName string
}{
	{"nginx", "Nginx Web Server"},
	{"docker", "Docker Engine"},
	{"mysql", "MySQL Database"},
	{"postgresql", "PostgreSQL"},
	{"ssh", "SSH Daemon"},
	{"apache2", "Apache Web Server"},
}

func GetServices(c *fiber.Ctx) error {
	var statuses []ServiceStatus

	for _, s := range trackedServices {
		// Check status
		cmd := exec.Command("systemctl", "is-active", s.Name)
		out, _ := cmd.Output() // Ignore error (exit code 3 means inactive)
		status := strings.TrimSpace(string(out))
		if status == "" {
			status = "inactive" // or not found
		}

		statuses = append(statuses, ServiceStatus{
			Name:        s.Name,
			DisplayName: s.DisplayName,
			Status:      status,
		})
	}

	return c.JSON(statuses)
}

func ManageService(c *fiber.Ctx) error {
	name := c.Params("name")
	action := c.Params("action")

	// Validate action
	allowedActions := map[string]bool{"start": true, "stop": true, "restart": true, "enable": true, "disable": true}
	if !allowedActions[action] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid action"})
	}

	// Validate service name (security: avoid command injection)
	validService := false
	for _, s := range trackedServices {
		if s.Name == name {
			validService = true
			break
		}
	}
	if !validService {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Service not managed"})
	}

	// Execute
	cmd := exec.Command("systemctl", action, name)
	if err := cmd.Run(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": fmt.Sprintf("Failed to %s %s: %v", action, name, err)})
	}

	// Log
	claims := c.Locals("user").(jwt.MapClaims)
	userID := uint(claims["iss"].(float64))
	DB.Create(&ActivityLog{
		UserID:    userID,
		Action:    "SERVICE_MANAGE",
		Target:    name,
		Details:   fmt.Sprintf("%s service", action),
		CreatedAt: time.Now(),
	})

	return c.JSON(fiber.Map{"message": fmt.Sprintf("Service %s %sed", name, action)})
}

func handleWebSocket(c *websocket.Conn) {
	// Simple routing based on query param: ?type=monitor|terminal|files
	connType := c.Query("type")

	switch connType {
	case "monitor":
		handleMonitor(c)
	case "terminal":
		handleTerminal(c)
	case "files":
		handleFiles(c)
	default:
		c.Close()
	}
}

// ==================== MONITOR HANDLER ====================
func handleMonitor(c *websocket.Conn) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	// State for network rate calculation
	var lastRx, lastTx uint64
	var lastTime time.Time

	// Cache for processes to track CPU usage deltas
	// pid -> *process.Process
	procCache := make(map[int32]*process.Process)

	for {
		select {
		case <-ticker.C:
			now := time.Now()

			// CPU
			cpuPerc, _ := cpu.Percent(0, false)
			cpuUsage := 0.0
			if len(cpuPerc) > 0 {
				cpuUsage = cpuPerc[0]
			}

			// Memory
			vMem, _ := mem.VirtualMemory()

			// Disk (Root)
			dStat, _ := disk.Usage("/")

			// Network
			// Use per-interface false to get total
			netStat, _ := net.IOCounters(false)
			rx := uint64(0)
			tx := uint64(0)
			if len(netStat) > 0 {
				rx = netStat[0].BytesRecv
				tx = netStat[0].BytesSent
			}

			// Calculate Rates
			rxRate := 0.0
			txRate := 0.0
			if !lastTime.IsZero() {
				duration := now.Sub(lastTime).Seconds()
				if duration > 0 {
					rxRate = float64(rx-lastRx) / duration
					txRate = float64(tx-lastTx) / duration
				}
			}
			lastRx = rx
			lastTx = tx
			lastTime = now

			// Host/System
			hInfo, _ := host.Info()
			lAvg, _ := load.Avg()
			uptime := time.Duration(hInfo.Uptime) * time.Second

			// Processes
			pids, _ := process.Pids()
			type ProcInfo struct {
				PID     int32   `json:"pid"`
				User    string  `json:"user"`
				CPU     float64 `json:"cpu"`
				Mem     float32 `json:"mem"`
				Command string  `json:"command"`
			}
			var procList []ProcInfo

			// Refresh cache: Remove dead PIDs
			currentPids := make(map[int32]bool)
			for _, pid := range pids {
				currentPids[pid] = true
			}
			for pid := range procCache {
				if !currentPids[pid] {
					delete(procCache, pid)
				}
			}

			// Update/Add PIDs
			for _, pid := range pids {
				proc, exists := procCache[pid]
				if !exists {
					newProc, err := process.NewProcess(pid)
					if err != nil {
						continue
					}
					proc = newProc
					procCache[pid] = proc
				}

				// Get Stats
				cpuP, err := proc.CPUPercent() // This call updates internal state
				if err != nil {
					continue
				}

				// Optional: Filter low CPU to reduce noise, but ensure we show *something*
				// If we filter too aggressively and everything is 0, list is empty.
				// Let's lower threshold or send top N regardless of usage.
				// But we need to collect them first.

				memP, _ := proc.MemoryPercent()
				name, _ := proc.Name()
				username, _ := proc.Username()

				// Limit command line length
				// cmdLine, _ := proc.Cmdline()
				// if cmdLine == "" { cmdLine = name }

				procList = append(procList, ProcInfo{
					PID:     pid,
					User:    username,
					CPU:     cpuP,
					Mem:     memP,
					Command: name,
				})
			}

			// Sort by CPU Descending
			// We can't import sort easily inside function, use bubble sort or simple selection
			// Bubble sort is fine for small N, but full ps list is large.
			// Optimization: partial sort or just sort fully (it's Go, it's fast enough for ~200 procs)
			for i := 0; i < len(procList); i++ {
				for j := i + 1; j < len(procList); j++ {
					if procList[i].CPU < procList[j].CPU {
						procList[i], procList[j] = procList[j], procList[i]
					}
				}
			}

			// Top 10
			if len(procList) > 10 {
				procList = procList[:10]
			}

			// payload
			payload := map[string]interface{}{
				"type": "update",
				"data": map[string]interface{}{
					"cpu": map[string]interface{}{"usage": cpuUsage},
					"memory": map[string]interface{}{
						"total": vMem.Total,
						"used":  vMem.Used,
					},
					"disk": map[string]interface{}{
						"total": dStat.Total,
						"used":  dStat.Used,
					},
					"network": map[string]interface{}{
						"rx_sec": rxRate,
						"tx_sec": txRate,
					},
					"system": map[string]interface{}{
						"uptime": uptime.String(),
						"load":   fmt.Sprintf("%.2f %.2f %.2f", lAvg.Load1, lAvg.Load5, lAvg.Load15),
					},
					"processes": procList,
				},
			}

			if err := c.WriteJSON(payload); err != nil {
				return
			}
		}
	}
}

// ==================== TERMINAL HANDLER ====================
func handleTerminal(c *websocket.Conn) {
	claims, ok := c.Locals("user").(jwt.MapClaims)

	// Create PTY
	cmd := exec.Command("/bin/bash")
	ptmx, err := pty.Start(cmd)
	if err != nil {
		c.WriteJSON(WSMsg{Type: "error", Data: "Failed to start pty"})
		return
	}

	// Session Tracking State
	var outputBuf bytes.Buffer
	var sessionCommands []string
	var commandBuf []byte
	var sessionUserID uint
	startTime := time.Now()

	if ok {
		userIdFloat, _ := claims["iss"].(float64)
		sessionUserID = uint(userIdFloat)
	}

	// Save Session on Exit
	defer func() {
		_ = ptmx.Close()
		if sessionUserID > 0 && len(sessionCommands) > 0 {
			// Save Session
			fullOutput := outputBuf.String()
			cmdsJSON, _ := json.Marshal(sessionCommands)

			// If buffer has leftover command, append it? Maybe not strictly needed if enter wasn't pressed.

			session := TerminalSession{
				UserID:    sessionUserID,
				Commands:  string(cmdsJSON),
				Output:    fullOutput,
				CreatedAt: startTime,
				EndedAt:   time.Now(),
			}
			DB.Create(&session)

			// Save Log linked to Session
			DB.Create(&ActivityLog{
				UserID:            sessionUserID,
				Action:            "TERMINAL_SESSION",
				Target:            "System",
				Details:           fmt.Sprintf("Terminal Session (%s) - %d cmds", time.Since(startTime).Round(time.Second), len(sessionCommands)),
				TerminalSessionID: &session.ID,
				CreatedAt:         time.Now(),
			})
		}
	}()

	done := make(chan struct{})

	// PTY Stdout -> WS AND Buffer
	go func() {
		// Use MultiWriter to copy to buffer and a Pipe we read? NO.
		// We manually read buffer and write to both.
		buf := make([]byte, 1024)
		for {
			n, err := ptmx.Read(buf)
			if err != nil {
				close(done)
				return
			}

			// Write to Recording buffer
			outputBuf.Write(buf[:n])

			// Send binary message
			if err := c.WriteMessage(websocket.BinaryMessage, buf[:n]); err != nil {
				close(done)
				return
			}
		}
	}()

	// WS -> PTY Stdin
	for {
		select {
		case <-done:
			return
		default:
			msgType, msg, err := c.ReadMessage()
			if err != nil {
				return
			}

			if msgType == websocket.TextMessage {
				// Check for resize
				var resizeMsg struct {
					Type string `json:"type"`
					Cols int    `json:"cols"`
					Rows int    `json:"rows"`
				}
				if len(msg) > 0 && msg[0] == '{' && json.Unmarshal(msg, &resizeMsg) == nil && resizeMsg.Type == "resize" {
					pty.Setsize(ptmx, &pty.Winsize{Rows: uint16(resizeMsg.Rows), Cols: uint16(resizeMsg.Cols)})
					continue
				}

				// Command Buffering Logic
				if sessionUserID > 0 {
					for _, b := range msg {
						if b == 13 { // CR (Enter)
							if len(commandBuf) > 0 {
								cmdStr := string(commandBuf)
								sessionCommands = append(sessionCommands, cmdStr) // Add to list
								commandBuf = commandBuf[:0]
							}
						} else if b == 127 || b == 8 { // Backspace
							if len(commandBuf) > 0 {
								commandBuf = commandBuf[:len(commandBuf)-1]
							}
						} else if b >= 32 && b <= 126 { // API printable
							commandBuf = append(commandBuf, b)
						}
					}
				}

				ptmx.Write(msg)
			} else if msgType == websocket.BinaryMessage {
				ptmx.Write(msg)
			}
		}
	}
}

// FILES HANDLER
type FileReq struct {
	Action  string                 `json:"action"` // list, cat, rm, mkdir, rename, copy, write
	Path    string                 `json:"path"`
	NewPath string                 `json:"newPath,omitempty"`
	Content string                 `json:"content,omitempty"`
	Data    map[string]interface{} `json:"data,omitempty"`
}

func handleFiles(c *websocket.Conn) {
	for {
		var req FileReq
		if err := c.ReadJSON(&req); err != nil {
			return
		}

		// Basic path cleaning
		cleanPath := filepath.Clean(req.Path)
		if cleanPath == "." || cleanPath == "" {
			cleanPath = "/"
		}

		switch req.Action {
		case "list":
			entries, err := ioutil.ReadDir(cleanPath)
			if err != nil {
				c.WriteJSON(map[string]interface{}{"error": err.Error(), "action": "list", "path": cleanPath})
				continue
			}
			var files []map[string]interface{}
			for _, e := range entries {
				files = append(files, map[string]interface{}{
					"name": e.Name(),
					"type": func() string {
						if e.IsDir() {
							return "folder"
						} else {
							return "file"
						}
					}(),
					"isDir": e.IsDir(),
					"size":  e.Size(),
					"mode":  e.Mode().String(),
					"mod":   e.ModTime().String(),
				})
			}
			c.WriteJSON(map[string]interface{}{"action": "list", "path": cleanPath, "data": files})

		case "cat": // Legacy simple read
			data, err := ioutil.ReadFile(cleanPath)
			if err != nil {
				c.WriteJSON(map[string]interface{}{"error": err.Error(), "action": "cat"})
				continue
			}
			c.WriteJSON(map[string]interface{}{"action": "cat", "path": cleanPath, "content": string(data)})

		case "read": // Advanced read (base64)
			data, err := ioutil.ReadFile(cleanPath)
			if err != nil {
				c.WriteJSON(map[string]interface{}{"error": err.Error(), "requestId": req.Data["requestId"]}) // Echo requestId if present for frontend matching
				continue
			}
			encoded := base64.StdEncoding.EncodeToString(data)
			c.WriteJSON(map[string]interface{}{
				"success":   true,
				"action":    "read",
				"data":      encoded,
				"requestId": req.Data["requestId"],
			})

		case "write":
			// Content expected to be base64 if encoding set, or plain string
			var data []byte
			var err error

			if req.Data != nil && req.Data["encoding"] == "base64" {
				data, err = base64.StdEncoding.DecodeString(req.Content)
				if err != nil {
					c.WriteJSON(map[string]interface{}{"error": "Invalid base64", "requestId": req.Data["requestId"]})
					continue
				}
			} else {
				data = []byte(req.Content)
			}

			err = ioutil.WriteFile(cleanPath, data, 0644)
			if err != nil {
				c.WriteJSON(map[string]interface{}{"success": false, "error": err.Error(), "requestId": req.Data["requestId"]})
			} else {

				// Log Success
				// We need userID. In websocket.Conn, c.Locals lookup needs helper.
				// websocket.conn has Locals which are copied from fiber context
				claims, ok := c.Locals("user").(jwt.MapClaims)
				if ok {
					userIdFloat, _ := claims["iss"].(float64)
					userID := uint(userIdFloat)

					// Log Activity
					logEntry := ActivityLog{
						UserID:    userID,
						Action:    "FILE_WRITE",
						Target:    cleanPath,
						Details:   fmt.Sprintf("Wrote %d bytes", len(data)),
						CreatedAt: time.Now(),
					}
					DB.Create(&logEntry)

					// Save File Version (Snapshot)
					// Verify content changed? For now, save every explicit save.
					version := FileVersion{
						LogID:     logEntry.ID,
						Path:      cleanPath,
						Content:   req.Content,
						Size:      int64(len(data)),
						CreatedAt: time.Now(),
					}
					// Only store content if it looks like text to avoid bloating DB with binaries
					// Simple heuristic: null byte check or just store it.
					// Let's store it as is (string(data)).
					version.Content = string(data)
					DB.Create(&version)
				} else {
					log.Println("DEBUG: User not found in Locals during FILE_WRITE")
				}

				c.WriteJSON(map[string]interface{}{"success": true, "action": "write", "requestId": req.Data["requestId"]})
			}

		case "rm":
			err := os.RemoveAll(cleanPath)
			if err != nil {
				c.WriteJSON(map[string]interface{}{"success": false, "error": err.Error()})
			} else {
				c.WriteJSON(map[string]interface{}{"success": true, "action": "rm"})
			}

		case "mkdir":
			err := os.MkdirAll(cleanPath, 0755)
			if err != nil {
				c.WriteJSON(map[string]interface{}{"success": false, "error": err.Error()})
			} else {
				c.WriteJSON(map[string]interface{}{"success": true, "action": "mkdir"})
			}

		case "rename":
			cleanNew := filepath.Clean(req.NewPath)
			err := os.Rename(cleanPath, cleanNew)
			if err != nil {
				c.WriteJSON(map[string]interface{}{"success": false, "error": err.Error()})
			} else {
				c.WriteJSON(map[string]interface{}{"success": true, "action": "rename"})
			}

		case "copy":
			cleanNew := filepath.Clean(req.NewPath)
			// Simple copy using cp command for recursion support
			cmd := exec.Command("cp", "-r", cleanPath, cleanNew)
			err := cmd.Run()
			if err != nil {
				c.WriteJSON(map[string]interface{}{"success": false, "error": err.Error()})
			} else {
				c.WriteJSON(map[string]interface{}{"success": true, "action": "copy"})
			}

		case "stats":
			// Count files and folders in the path
			var fileCount, folderCount int64
			var totalSize int64

			// Only ReadDir (non-recursive for now like main1.go implied,
			// though main1.go used `find -maxdepth 1`. Let's match sticking to immediate children or recursive?
			// User request implies "properties". Let's do simple ReadDir for speed.)
			files, err := ioutil.ReadDir(cleanPath)
			if err == nil {
				for _, f := range files {
					if f.IsDir() {
						folderCount++
					} else {
						fileCount++
						totalSize += f.Size()
					}
				}
			}
			c.WriteJSON(map[string]interface{}{
				"success": true,
				"action":  "stats",
				"data": map[string]interface{}{
					"fileCount":   fileCount,
					"folderCount": folderCount,
					"totalSize":   totalSize,
				},
			})

		case "diskusage":
			// Use gopsutil for disk usage
			// Check root for fallback or specific mount
			u, err := disk.Usage(cleanPath)
			if err != nil {
				// Fallback to root
				u, _ = disk.Usage("/")
			}

			var usedPercent float64 = 0
			var usedStr, totalStr, freeStr string = "0 GB", "0 GB", "0 GB"

			if u != nil {
				usedPercent = u.UsedPercent
				usedStr = fmt.Sprintf("%.1f GB", float64(u.Used)/1024/1024/1024)
				totalStr = fmt.Sprintf("%.1f GB", float64(u.Total)/1024/1024/1024)
				freeStr = fmt.Sprintf("%.1f GB", float64(u.Free)/1024/1024/1024)
			}

			c.WriteJSON(map[string]interface{}{
				"success": true,
				"action":  "diskusage",
				"data": map[string]interface{}{
					"usedPercent": usedPercent,
					"usedStr":     usedStr,
					"totalStr":    totalStr,
					"freeStr":     freeStr,
				},
			})

		case "get_logs":
			// Return empty logs for now, as we don't have a logger DB set up
			c.WriteJSON(map[string]interface{}{
				"success": true,
				"action":  "get_logs",
				"data":    []interface{}{},
			})
		}
	}
}

func ChangePassword(c *fiber.Ctx) error {
	claims := c.Locals("user").(jwt.MapClaims)
	userIdFloat, _ := claims["iss"].(float64)
	userId := uint(userIdFloat)

	var data map[string]string
	if err := c.BodyParser(&data); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid input"})
	}

	var user User
	if err := DB.First(&user, userId).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "User not found"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(data["old_password"])); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Incorrect old password"})
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(data["new_password"]), 14)
	user.Password = string(hash)

	DB.Save(&user)

	return c.JSON(fiber.Map{"message": "Password changed successfully"})
}

func AdminMiddleware(c *fiber.Ctx) error {
	user := c.Locals("user").(jwt.MapClaims)
	if user["role"] != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "Admin access required",
		})
	}
	return c.Next()
}

func GetAllUsers(c *fiber.Ctx) error {
	var users []User
	// Retrieve all users, omit sensitive info like password
	if err := DB.Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Error fetching users"})
	}
	return c.JSON(users)
}

func UpdateUser(c *fiber.Ctx) error {
	id := c.Params("id")
	var user User
	if err := DB.First(&user, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "User not found"})
	}

	var data map[string]interface{}
	if err := c.BodyParser(&data); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid input"})
	}

	// Update allowed fields
	if val, ok := data["username"].(string); ok && val != "" {
		user.Username = val
	}
	if val, ok := data["email"].(string); ok && val != "" {
		user.Email = val
	}
	if val, ok := data["role"].(string); ok && val != "" {
		user.Role = val
	}
	if val, ok := data["status"].(string); ok && val != "" {
		user.Status = val
	}
	// Handle password update if needed
	if val, ok := data["password"].(string); ok && val != "" {
		hash, _ := bcrypt.GenerateFromPassword([]byte(val), 14)
		user.Password = string(hash)
	}

	DB.Save(&user)
	return c.JSON(user)
}

func DeleteUser(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := DB.Delete(&User{}, id).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Error deleting user"})
	}
	return c.JSON(fiber.Map{"message": "User deleted successfully"})
}

func seedAdmin() {
	var count int64
	DB.Model(&User{}).Count(&count)
	if count == 0 {
		password, _ := bcrypt.GenerateFromPassword([]byte("password123"), 14)
		admin := User{
			Username:  "admin",
			Email:     "admin@example.com",
			Password:  string(password),
			Role:      "admin",
			CreatedAt: time.Now(),
			Status:    "active",
		}
		DB.Create(&admin)
		log.Println("Admin user seeded: admin / password123")
	}
}

func Register(c *fiber.Ctx) error {
	// Check if the current user is an admin
	user := c.Locals("user").(jwt.MapClaims)
	if user["role"] != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "Only admins can register new users",
		})
	}

	var data map[string]string
	if err := c.BodyParser(&data); err != nil {
		return err
	}

	password, _ := bcrypt.GenerateFromPassword([]byte(data["password"]), 14)

	newUser := User{
		Username:  data["username"],
		Email:     data["email"],
		Password:  string(password),
		Role:      "user", // Default role
		CreatedAt: time.Now(),
		Status:    "active",
	}

	// Optional: Allow setting role/status if provided
	if val, ok := data["role"]; ok {
		newUser.Role = val
	}
	if val, ok := data["status"]; ok {
		newUser.Status = val
	}

	if err := DB.Create(&newUser).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Could not create user (username or email might be taken)",
		})
	}

	// Log Activity
	go func(adminID uint, newUsername string) {
		DB.Create(&ActivityLog{
			UserID:    adminID,
			Action:    "USER_REGISTER",
			Target:    newUsername,
			Details:   "Admin created user " + newUsername,
			CreatedAt: time.Now(),
		})
	}(uint(user["iss"].(float64)), newUser.Username)

	return c.JSON(newUser)
}

func Login(c *fiber.Ctx) error {
	var data map[string]string
	if err := c.BodyParser(&data); err != nil {
		return err
	}

	var user User
	// Allow login with username or email
	DB.Where("username = ?", data["username"]).Or("email = ?", data["username"]).First(&user)

	if user.ID == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "User not found",
		})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(data["password"])); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Incorrect password",
		})
	}

	if user.Status != "active" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "Account is inactive. Please contact admin.",
		})
	}

	claims := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iss":  user.ID,
		"role": user.Role,
		"exp":  time.Now().Add(time.Hour * 24).Unix(), // 1 day
	})

	token, err := claims.SignedString(SecretKey)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Could not login",
		})
	}

	cookie := fiber.Cookie{
		Name:     "jwt",
		Value:    token,
		Expires:  time.Now().Add(time.Hour * 24),
		HTTPOnly: true,
	}

	c.Cookie(&cookie)

	// Log Activity
	clientIP := c.IP()
	go func(uid uint, uname string, ip string) {
		DB.Create(&ActivityLog{
			UserID:    uid,
			Action:    "LOGIN",
			Target:    "System",
			Details:   "User logged in from " + ip,
			CreatedAt: time.Now(),
		})
	}(user.ID, user.Username, clientIP)

	return c.JSON(fiber.Map{
		"message": "success",
	})
}

func Me(c *fiber.Ctx) error {
	claims := c.Locals("user").(jwt.MapClaims)

	// The "iss" claim is stored as a float64 by default when parsing JSON
	userIdFloat, ok := claims["iss"].(float64)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "invalid user id"})
	}
	userId := uint(userIdFloat)

	var user User
	DB.Where("id = ?", userId).First(&user)

	return c.JSON(user)
}

func Logout(c *fiber.Ctx) error {
	cookie := fiber.Cookie{
		Name:     "jwt",
		Value:    "",
		Expires:  time.Now().Add(-time.Hour),
		HTTPOnly: true,
	}

	c.Cookie(&cookie)

	return c.JSON(fiber.Map{
		"message": "success",
	})
}

func AuthMiddleware(c *fiber.Ctx) error {
	cookie := c.Cookies("jwt")

	if cookie == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Unauthenticated",
		})
	}

	token, err := jwt.Parse(cookie, func(token *jwt.Token) (interface{}, error) {
		return SecretKey, nil
	})

	if err != nil || !token.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Unauthenticated",
		})
	}

	claims := token.Claims.(jwt.MapClaims)
	c.Locals("user", claims)

	return c.Next()
}

// === Activity Logs Handlers ===

func DeleteLog(c *fiber.Ctx) error {
	id := c.Params("id")
	var log ActivityLog

	if err := DB.First(&log, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "Log not found"})
	}

	// Cleanup Session if exists
	if log.TerminalSessionID != nil {
		DB.Delete(&TerminalSession{}, log.TerminalSessionID)
	}

	DB.Delete(&log)
	return c.JSON(fiber.Map{"message": "Log deleted"})
}

func GetLogs(c *fiber.Ctx) error {
	claims := c.Locals("user").(jwt.MapClaims)
	role := claims["role"].(string)

	var logs []ActivityLog

	if role == "admin" {
		// Admin sees all, preload User
		DB.Preload("User").Order("created_at desc").Limit(100).Find(&logs)
	} else {
		// User sees own
		userIdFloat, _ := claims["iss"].(float64)
		userID := uint(userIdFloat)
		DB.Preload("User").Where("user_id = ?", userID).Order("created_at desc").Limit(100).Find(&logs)
	}

	return c.JSON(logs)
}

func GetFileHistory(c *fiber.Ctx) error {
	path := c.Query("path")
	if path == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "path required"})
	}

	var versions []FileVersion
	// We want list of versions, maybe not full content if too big?
	// For now, let's select everything but Content to be light
	DB.Select("id, log_id, path, size, created_at").Where("path = ?", path).Order("created_at desc").Find(&versions)

	return c.JSON(versions)
}

func GetFileVersion(c *fiber.Ctx) error {
	id := c.Params("id")
	var version FileVersion
	if err := DB.First(&version, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "Version not found"})
	}
	return c.JSON(version)
}

func GetTerminalSession(c *fiber.Ctx) error {
	id := c.Params("id")
	var session TerminalSession
	if err := DB.First(&session, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "Session not found"})
	}
	return c.JSON(session)
}

// ==================== SETTINGS HANDLER ====================

func GetSettings(c *fiber.Ctx) error {
	var settings []SystemSetting
	if err := DB.Find(&settings).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Failed to fetch settings"})
	}

	// Mask secrets for frontend
	maskedSettings := make(map[string]string)
	for _, s := range settings {
		val := s.Value
		if s.Key == "GEMINI_API_KEY" && len(val) > 8 {
			val = "sk-..." + val[len(val)-4:] // Show last 4 chars
		}
		maskedSettings[s.Key] = val
	}
	// Defaults if missing
	if _, ok := maskedSettings["AI_MODEL"]; !ok {
		maskedSettings["AI_MODEL"] = "gemini-2.0-flash"
	}

	return c.JSON(maskedSettings)
}

func UpdateSettings(c *fiber.Ctx) error {
	var payload map[string]string
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid body"})
	}

	for k, v := range payload {
		// If sending masked key, skip update
		if k == "GEMINI_API_KEY" && strings.HasPrefix(v, "sk-...") {
			continue
		}
		DB.Save(&SystemSetting{Key: k, Value: strings.TrimSpace(v)})
	}

	return c.JSON(fiber.Map{"message": "Settings updated"})
}

// ==================== AI HANDLER ====================

type ChatRequest struct {
	Message string `json:"message"`
}

type GeminiRequest struct {
	Contents []GeminiContent `json:"contents"`
}

type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}

type GeminiPart struct {
	Text string `json:"text"`
}

type GeminiResponse struct {
	Candidates []struct {
		Content GeminiContent `json:"content"`
	} `json:"candidates"`
}

func ChatWithAI(c *fiber.Ctx) error {
	var req ChatRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid request"})
	}

	// 1. Get Config
	var apiKeySetting SystemSetting
	if err := DB.First(&apiKeySetting, "key = ?", "GEMINI_API_KEY").Error; err != nil || apiKeySetting.Value == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "AI not configured. Please set API Key in Settings."})
	}
	apiKey := apiKeySetting.Value

	var modelSetting SystemSetting
	model := "gemini-2.0-flash"
	if err := DB.First(&modelSetting, "key = ?", "AI_MODEL").Error; err == nil && modelSetting.Value != "" {
		model = modelSetting.Value
	}

	// Safe Fallback: Redirect retired models to stable latest
	if model == "gemini-1.5-flash" || model == "gemini-1.5-flash-latest" {
		model = "gemini-2.5-flash"
	}

	// 2. Gather Context (Logs & Stats)
	// Fetch last 20 logs
	var logs []ActivityLog
	DB.Order("created_at desc").Limit(20).Find(&logs)
	logContext := "Recent System Logs:\n"
	for _, l := range logs {
		logContext += fmt.Sprintf("[%s] %s: %s\n", l.CreatedAt.Format("15:04:05"), l.Action, l.Details)
	}

	// Fetch Stats (We can't easily access the websocket stats stream here without refactoring,
	// so we'll grab a quick snapshot using gopsutil directly)
	cpuP, _ := cpu.Percent(0, false)
	vMem, _ := mem.VirtualMemory()
	statsContext := fmt.Sprintf("System Status:\nCPU Usage: %.1f%%\nRAM Usage: %.1f%%\nUptime: %v\n",
		cpuP[0], vMem.UsedPercent, host.Info) // host.Info needs syscall, slight simplified

	// 3. Construct Prompt
	systemPrompt := "You are 'Server Genius', an AI assistant for a VPS management dashboard. " +
		"You are helpful, concise, and technical. " +
		"Use the provided context to answer the user's question. " +
		"If the user asks to perform an action (like kill process), explain HOW to do it using the dashboard, don't just say you can't."

	fullPrompt := fmt.Sprintf("%s\n\nCONTEXT:\n%s\n%s\n\nUSER QUESTION: %s", systemPrompt, statsContext, logContext, req.Message)

	// 4. Call Gemini API
	geminiReq := GeminiRequest{
		Contents: []GeminiContent{
			{Parts: []GeminiPart{{Text: fullPrompt}}},
		},
	}
	reqBody, _ := json.Marshal(geminiReq)

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Failed to call AI: " + err.Error()})
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := ioutil.ReadAll(resp.Body)
		return c.Status(resp.StatusCode).JSON(fiber.Map{"message": "AI Error: " + string(body)})
	}

	var geminiResp GeminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Failed to parse AI response"})
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Empty response from AI"})
	}

	reply := geminiResp.Candidates[0].Content.Parts[0].Text
	return c.JSON(fiber.Map{"reply": reply})
}
