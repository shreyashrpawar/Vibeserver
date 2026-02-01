"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { ThemeToggle } from "../../components/theme-toggle";
import { useTheme } from "next-themes";

export default function TerminalComponent() {
    const terminalRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { theme } = useTheme();
    const termRef = useRef<Terminal | null>(null);

    // Initialize Terminal
    useEffect(() => {
        if (!terminalRef.current) return;

        // Initialize xterm
        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: "#000000",
                foreground: "#ffffff",
            }
        });
        termRef.current = term;

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);

        // Robust fit function
        const safeFit = () => {
            try {
                fitAddon.fit();
                // If ws is open, sync size
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
                }
            } catch (e) {
                console.error("Values not ready yet", e);
            }
        };

        // Connect to WS
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws?type=terminal`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            // Initial resize sync
            ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
        };

        ws.onmessage = (event) => {
            if (event.data instanceof Blob) {
                const reader = new FileReader();
                reader.onload = () => {
                    term.write(new Uint8Array(reader.result as ArrayBuffer));
                };
                reader.readAsArrayBuffer(event.data);
            } else {
                term.write(event.data);
            }
        };

        term.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });

        // Initialize dimensions
        // Use requestAnimationFrame to ensure DOM is ready
        let resizeTimeout: any;
        requestAnimationFrame(() => {
            safeFit();
            // Double check after a small delay for safety
            setTimeout(safeFit, 100);
        });

        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(safeFit, 100); // Debounce
        }

        window.addEventListener("resize", handleResize);

        return () => {
            ws.close();
            term.dispose();
            window.removeEventListener("resize", handleResize);
            clearTimeout(resizeTimeout);
        };
    }, []);

    // Theme Effect
    useEffect(() => {
        if (!termRef.current) return;

        // Wait for theme to be resolved (system might be "system", need effective theme)
        // next-themes handles "system" by setting class on html, but useTheme hook gives "system" as value sometimes.
        // We can check the class on document element or just map robustly.
        // Actually useTheme gives `resolvedTheme` which is either 'light' or 'dark'.

        // However, `useTheme` hooks might need the component to be mounted under provider.
        // We are under provider in layout.

        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDark) {
            termRef.current.options.theme = {
                background: "#000000",
                foreground: "#ffffff",
                cursor: "#ffffff",
                selectionBackground: "#ffffff40"
            };
        } else {
            termRef.current.options.theme = {
                background: "#ffffff",
                foreground: "#000000",
                cursor: "#000000",
                selectionBackground: "#00000020"
            };
        }
    }, [theme]);

    return (
        <div className="h-full flex flex-col bg-stone-950/90 dark:bg-slate-950/50 border-t border-zinc-200 dark:border-white/10 overflow-hidden backdrop-blur-md shadow-2xl">
            <div className="bg-white/5 border-b border-zinc-200 dark:border-white/5 p-3 flex justify-between items-center px-4">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                    </div>
                    <span className="text-xs font-mono text-slate-400 ml-2 shadow-inner bg-black/20 px-2 py-0.5 rounded border border-white/5">root@vibeserver:~</span>
                </div>
                <div className="text-xs text-slate-600">bash</div>
            </div>
            <div className="flex-1 w-full overflow-hidden p-1 bg-black/40" ref={terminalRef} />
        </div>
    );
}
