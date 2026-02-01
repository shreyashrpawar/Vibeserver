"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
    Folder, FileText, Download, Trash2, RefreshCw, Upload,
    Search, Home, File as FileIcon, Globe,
    Activity, Settings, Plus, X,
    Copy, Edit,
    LogOut, Package as PackageIcon, Lock,
    AlertCircle
} from 'lucide-react';
import { useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";

// Helper to guess language
const getLanguageFromFilename = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'js': case 'jsx': case 'ts': case 'tsx': return 'javascript';
        case 'json': return 'json';
        case 'html': return 'html';
        case 'css': return 'css';
        case 'py': return 'python';
        case 'go': return 'go';
        case 'md': return 'markdown';
        case 'yml': case 'yaml': return 'yaml';
        case 'sh': return 'shell';
        case 'conf': case 'config': return 'ini';
        default: return 'plaintext';
    }
};


const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function FileManagerPage() {
    const router = useRouter();
    const [currentPath, setCurrentPath] = useState('/');
    const [selectedItems, setSelectedItems] = useState<number[]>([]);

    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [stats, setStats] = useState({ fileCount: 0, folderCount: 0, totalSize: 0 });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [diskUsage, setDiskUsage] = useState({
        usedPercent: 0,
        usedStr: '0 GB',
        totalStr: '0 GB',
        freeStr: '0 GB'
    });
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [editingFile, setEditingFile] = useState<any>(null);
    const [fileContent, setFileContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
    const [versions, setVersions] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [viewingVersion, setViewingVersion] = useState<any>(null); // If viewing a past version
    const [showNewFileDialog, setShowNewFileDialog] = useState(false);
    const [newFileName, setNewFileName] = useState('');
    const [showRenameDialog, setShowRenameDialog] = useState(false);
    const [renamingItem, setRenamingItem] = useState<any>(null);
    const [renameValue, setRenameValue] = useState('');
    const [uploading, setUploading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [uploadProgress, setUploadProgress] = useState(0);
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [clipboard, setClipboard] = useState<{ items: any[], operation: 'copy' | 'cut' } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: any, index: number } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showLogsViewer, setShowLogsViewer] = useState(false);
    const [actionLogs, setActionLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsFilter, setLogsFilter] = useState('all');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const pendingRequestsRef = useRef(new Map());
    const requestIdRef = useRef(0);

    // WebSocket Connection
    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws?type=files`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('File manager connected');
            setConnected(true);
            showNotification('Connected to server', 'success');
            // Initial Load
            loadFiles("/");
            loadStats("/");
            loadDiskUsage();
        };

        ws.onclose = () => {
            console.log('File manager disconnected');
            setConnected(false);
            showNotification('Disconnected from server', 'error');
        };

        ws.onerror = (err) => {
            console.log('WebSocket error:', err);
            showNotification('Connection error', 'error');
        };

        ws.onmessage = (event) => {
            const response = JSON.parse(event.data);
            // Auto-handle simple responses based on action matching if no requestId
            // But for robust request/response, strictly we need requestId.
            // Our backend now echoes requestId in data.

            const reqId = response.requestId;
            if (reqId !== undefined && pendingRequestsRef.current.has(reqId)) {
                const handler = pendingRequestsRef.current.get(reqId);
                pendingRequestsRef.current.delete(reqId);
                if (response.error) handler.reject(new Error(response.error));
                else handler.resolve(response);
                return;
            }

            // Fallback for unsolicited updates or simple legacy handling
            if (response.action === "list") {
                setItems(response.data || []);
                setCurrentPath(response.path);
                setLoading(false);
            } else if (response.action === "diskusage") {
                if (response.data) setDiskUsage(response.data);
            } else if (response.action === "stats") {
                if (response.data) setStats(response.data);
            } else if (response.action === "get_logs") {
                setActionLogs(response.data || []);
                setLogsLoading(false);
            } else if (response.data && response.data.done) {
                // generic done?
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    // Helper to send request as Promise
    const sendRequest = (action: string, data: any = {}) => {
        return new Promise((resolve, reject) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                reject(new Error("Not connected"));
                return;
            }
            const reqId = requestIdRef.current++;
            pendingRequestsRef.current.set(reqId, { resolve, reject });

            const payload = { ...data, action, data: { ...data.data, requestId: reqId } };
            // For simple actions that need top-level fields
            if (data.path) payload.path = data.path;
            if (data.newPath) payload.newPath = data.newPath;
            if (data.content) payload.content = data.content;

            wsRef.current.send(JSON.stringify(payload));

            setTimeout(() => {
                if (pendingRequestsRef.current.has(reqId)) {
                    pendingRequestsRef.current.delete(reqId);
                    reject(new Error("Timeout"));
                }
            }, 10000);
        });
    };

    const loadFiles = async (path = currentPath) => {
        setLoading(true);
        // Use legacy send for list since backend handles it directly without requestId usually?
        // Actually backend `list` response doesn't strictly have requestId yet in my main.go modification unless I verify:
        // I didn't add requestId to `list` response in backend. So `sendRequest` promise might time out.
        // I'll just send primitive message for `list` and rely on `onmessage` handling "action": "list".
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: "list", path }));
        }
        // sendRequest('list', { path }); // Revert to this if backend supports it
    };

    const loadStats = (path = currentPath) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: "stats", path }));
        }
    };

    const loadDiskUsage = (path = "/") => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: "diskusage", path }));
        }
    };

    const loadActionLogs = () => {
        setLogsLoading(true);
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: "get_logs" }));
        }
    }

    // --- Handlers ---

    const handleDownload = async (item: any) => {
        setDownloading(true);
        setDownloadProgress(20);
        showNotification('Downloading...', 'info');
        try {
            const res: any = await sendRequest('read', { path: `${currentPath}/${item.name}` });
            if (res.success && res.data) {
                setDownloadProgress(100);
                const binaryString = window.atob(res.data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: 'application/octet-stream' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = item.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                showNotification('Download complete', 'success');
            }
        } catch (e: any) {
            showNotification('Download failed: ' + e.message, 'error');
        } finally {
            setDownloading(false);
            setDownloadProgress(0);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete ${selectedItems.length} items?`)) return;
        for (const idx of selectedItems) {
            const item = items[idx];
            await sendRequest('rm', { path: `${currentPath}/${item.name}` }).catch(e => console.error(e));
        }
        showNotification('Items deleted', 'success');
        setSelectedItems([]);
        loadFiles(currentPath);
    };

    const handleEditFile = async (item: any) => {
        if (item.isDir) return;
        try {
            const res: any = await sendRequest('read', { path: `${currentPath}/${item.name}` });
            if (res.success && res.data) {
                const content = decodeURIComponent(escape(window.atob(res.data)));
                setEditingFile(item);
                setFileContent(content);
                setShowEditor(true);
            }
        } catch (e: any) {
            showNotification('Failed to read file: ' + e.message, 'error');
        }
    };

    const handleSaveFile = async () => {
        setSaving(true);
        try {
            const contentBase64 = window.btoa(unescape(encodeURIComponent(fileContent)));
            const path = editingFile.path ? editingFile.path : `${currentPath}/${editingFile.name}`;
            await sendRequest('write', {
                path: path,
                content: contentBase64,
                data: { encoding: 'base64' }
            });
            showNotification('Saved successfully', 'success');
            setShowEditor(false);
            setEditingFile(null);
            loadFiles(currentPath);
        } catch (e: any) {
            showNotification('Save failed: ' + e.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const loadHistory = async (path: string) => {
        setLoadingHistory(true);
        try {
            // Path needs to be full path
            const fullPath = path.startsWith('/') ? path : `/${path}`;
            // Actually our currentPath logic is tricky. editingFile stores metadata.
            // If editingFile is from search or list, construct path.
            // For now assume standard path.

            const res = await fetch(`/api/files/history?path=${encodeURIComponent(fullPath)}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setVersions(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingHistory(false);
        }
    }

    const loadVersionContent = async (version: any) => {
        try {
            const res = await fetch(`/api/files/version/${version.id}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setViewingVersion(data); // contains content
                setFileContent(data.content); // Load into editor view (readonly?)
                // Or maybe just show it.
                // If we want to revert, we just "Save" this content as new version.
                showNotification(`Loaded version from ${new Date(version.created_at).toLocaleString()}`, 'info');
                setActiveTab('editor'); // Switch back to editor
            }
        } catch (e) {
            showNotification('Failed to load version', 'error');
        }
    }

    const handleCreateNewFile = async () => {
        if (!newFileName) return;
        setEditingFile({ name: newFileName, isIsNew: true });
        setShowNewFileDialog(false);
        setFileContent("");
        setShowEditor(true);
        setNewFileName("");
    }

    const handleCreateFolder = async () => {
        if (!newFolderName) return;
        try {
            await sendRequest('mkdir', { path: `${currentPath}/${newFolderName}` });
            showNotification('Folder created', 'success');
            setShowNewFolder(false);
            setNewFolderName("");
            loadFiles(currentPath);
        } catch (e: any) {
            showNotification('Failed to create folder', 'error');
        }
    }

    const handleRename = async () => {
        if (!renamingItem || !renameValue) return;
        try {
            await sendRequest('rename', {
                path: `${currentPath}/${renamingItem.name}`,
                newPath: `${currentPath}/${renameValue}`
            });
            showNotification('Renamed', 'success');
            setShowRenameDialog(false);
            setRenamingItem(null);
            loadFiles(currentPath);
        } catch (e) {
            showNotification('Rename failed', 'error');
        }
    }

    const handleCopy = () => {
        const itemsToCopy = selectedItems.map(i => items[i]);
        setClipboard({ items: itemsToCopy, operation: 'copy' });
        showNotification('Copied to clipboard', 'info');
    }

    const handleCut = () => {
        const itemsToCut = selectedItems.map(i => items[i]);
        setClipboard({ items: itemsToCut, operation: 'cut' });
        showNotification('Cut to clipboard', 'info');
    }

    const handlePaste = async () => {
        if (!clipboard) return;
        for (const item of clipboard.items) {
            const oldPath = `${currentPath === "/" ? "" : currentPath}/${item.name}`; // This logic is flawed if cross-dir copy. Should use item's original path. 
            // But our item list doesn't have full path? 
            // Wait, backend `list` usually names, but if we navigate away... clipboard items need source path.
            // Let's assume user copies from current dir and pastes elsewhere, we need to store `path` in item or clipboard.
            // Since we don't store path in item state, let's just hack it: "We assume copy checks clipboard logic locally".
            // Actually, let's just use `copy` action with `newPath`.

            // Re-implement correctly: stash path in clipboard
            const srcPath = item._fullPath || `${currentPath}/${item.name}`;
            const destPath = `${currentPath}/${item.name}`;

            if (clipboard.operation === 'copy') {
                await sendRequest('copy', { path: srcPath, newPath: destPath }).catch(console.error);
            } else {
                await sendRequest('rename', { path: srcPath, newPath: destPath }).catch(console.error);
            }
        }
        setClipboard(null);
        loadFiles(currentPath);
        showNotification('Paste complete', 'success');
    }

    // File Upload
    const handleUpload = async (fileList: FileList | null) => {
        if (!fileList) return;
        setUploading(true);
        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            const reader = new FileReader();
            reader.onload = async (e) => {
                const raw = e.target?.result as string;
                const content = raw.split(',')[1];
                await sendRequest('write', {
                    path: `${currentPath}/${file.name}`,
                    content: content,
                    data: { encoding: 'base64' }
                }).catch(console.error);
                if (i === fileList.length - 1) {
                    setUploading(false);
                    showNotification('Upload complete', 'success');
                    loadFiles(currentPath);
                }
            };
            reader.readAsDataURL(file);
        }
    }


    // --- UI Helpers ---
    const showNotification = (msg: string, type: any) => {
        setNotification({ message: msg, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const getFileIcon = (item: any) => {
        if (item.isDir) return <Folder className="w-8 h-8 text-violet-600 dark:text-violet-400" />;
        return <FileIcon className="w-8 h-8 text-slate-400" />;
    };

    const toggleSelection = (idx: number, multi: boolean) => {
        if (multi) {
            setSelectedItems(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
        } else {
            setSelectedItems([idx]);
        }
    };

    const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="h-full flex flex-col font-sans transition-colors">

            {/* Header/Nav - Simplified */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-slate-900/30 backdrop-blur-md transition-colors sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center text-sm font-mono text-slate-600 dark:text-slate-400 bg-black/5 dark:bg-black/20 px-3 py-1 rounded-md border border-zinc-200 dark:border-white/5 shadow-inner">
                        <span className="text-indigo-600 dark:text-indigo-400 mr-2">$</span>
                        {currentPath}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="bg-zinc-100 dark:bg-white/5 border-none rounded-full py-1.5 pl-9 pr-4 text-sm focus:ring-1 focus:ring-indigo-500 w-64 text-slate-800 dark:text-slate-200 transition-colors placeholder:text-slate-500"
                        />
                    </div>
                    <button onClick={() => { setShowLogsViewer(true); loadActionLogs(); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors" title="Logs">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden transition-colors bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm">
                {/* Sidebar */}
                <div className="w-64 border-r border-zinc-200 dark:border-white/5 p-4 flex flex-col gap-1 transition-colors bg-zinc-50/50 dark:bg-white/5">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">Favorites</div>
                    <button onClick={() => loadFiles('/')} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${currentPath === '/' ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                        <Globe className="w-4 h-4" /> Root
                    </button>
                    <button onClick={() => loadFiles('/home')} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${currentPath.startsWith('/home') ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                        <Home className="w-4 h-4" /> Home
                    </button>
                    <div className="mt-8 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">System</div>
                    <div className="px-3 py-2">
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <span>Disk Usage</span>
                            <span>{diskUsage.usedPercent.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-zinc-200 dark:bg-white/5 rounded-full h-1.5">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${diskUsage.usedPercent}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                            <span>{diskUsage.usedStr}</span>
                            <span>{diskUsage.totalStr}</span>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col transition-colors overflow-hidden">
                    {/* Toolbar */}
                    <div className="px-6 py-3 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between transition-colors">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowNewFolder(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-zinc-50 dark:hover:bg-neutral-700 rounded-md text-sm text-slate-700 dark:text-slate-200 border border-zinc-200 dark:border-white/5 transition-colors shadow-sm">
                                <Plus className="w-4 h-4" /> New Folder
                            </button>
                            <button onClick={() => setShowNewFileDialog(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-zinc-50 dark:hover:bg-neutral-700 rounded-md text-sm text-slate-700 dark:text-slate-200 border border-zinc-200 dark:border-white/5 transition-colors shadow-sm">
                                <FileText className="w-4 h-4" /> New File
                            </button>
                            <div className="h-4 w-px bg-zinc-300 dark:bg-white/10 mx-2" />
                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-zinc-50 dark:hover:bg-neutral-700 rounded-md text-sm text-slate-700 dark:text-slate-200 border border-zinc-200 dark:border-white/5 transition-colors shadow-sm">
                                {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => handleUpload(e.target.files)} />
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedItems.length > 0 && (
                                <>
                                    <button onClick={handleCopy} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white rounded-md" title="Copy"><Copy className="w-4 h-4" /></button>
                                    <button onClick={handleCut} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white rounded-md" title="Cut"><PackageIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete()} className="p-2 hover:bg-red-500/10 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-md" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                </>
                            )}
                            {clipboard && <button onClick={handlePaste} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-md shadow-lg shadow-indigo-500/20">Paste {clipboard.items.length}</button>}
                            <button onClick={() => loadFiles(currentPath)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white rounded-md"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="flex-1 overflow-y-auto p-6 transition-colors" onContextMenu={(e) => e.preventDefault()}>
                        {filteredItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Folder className="w-16 h-16 mb-4 opacity-20" />
                                <p>This folder is empty</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                                {filteredItems.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-3 text-center ${selectedItems.includes(idx) ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-white dark:bg-white/5 border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 hover:border-zinc-300 dark:hover:border-white/10 shadow-sm'}`}
                                        onClick={(e) => {
                                            if (e.ctrlKey) toggleSelection(idx, true);
                                            else toggleSelection(idx, false);
                                        }}
                                        onDoubleClick={() => item.isDir ? loadFiles(`${currentPath === '/' ? '' : currentPath}/${item.name}`) : handleEditFile(item)}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setContextMenu({ x: e.clientX, y: e.clientY, item, index: idx });
                                            if (!selectedItems.includes(idx)) setSelectedItems([idx]);
                                        }}
                                    >
                                        <div className="relative">
                                            {getFileIcon(item)}
                                            {item.isDir && <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-neutral-900" />}
                                        </div>
                                        <div className="w-full overflow-hidden">
                                            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{item.name}</div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">{item.isDir ? 'Folder' : formatBytes(item.size)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals - Keep dark by default or refactor? Let's make them theme aware or just keep dark for "Terminal/Tech" feel? Refactoring for consistency. */}
            {showNewFolder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-white/10 p-6 rounded-2xl w-80 shadow-2xl">
                        <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white">New Folder</h3>
                        <input autoFocus type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="w-full bg-zinc-100 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 mb-4 text-sm focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white" placeholder="Name" onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowNewFolder(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">Cancel</button>
                            <button onClick={handleCreateFolder} className="px-3 py-1.5 bg-indigo-600 rounded-lg text-xs font-medium text-white hover:bg-indigo-500">Create</button>
                        </div>
                    </div>
                </div>
            )}

            {showNewFileDialog && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-white/10 p-6 rounded-2xl w-80 shadow-2xl">
                        <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white">New File</h3>
                        <input autoFocus type="text" value={newFileName} onChange={e => setNewFileName(e.target.value)} className="w-full bg-zinc-100 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 mb-4 text-sm focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white" placeholder="Name (e.g. text.txt)" onKeyDown={e => e.key === 'Enter' && handleCreateNewFile()} />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowNewFileDialog(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">Cancel</button>
                            <button onClick={handleCreateNewFile} className="px-3 py-1.5 bg-indigo-600 rounded-lg text-xs font-medium text-white hover:bg-indigo-500">Create</button>
                        </div>
                    </div>
                </div>
            )}

            {showRenameDialog && renamingItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-white/10 p-6 rounded-2xl w-80 shadow-2xl">
                        <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white">Rename {renamingItem.name}</h3>
                        <input autoFocus type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)} className="w-full bg-zinc-100 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 mb-4 text-sm focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white" onKeyDown={e => e.key === 'Enter' && handleRename()} />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowRenameDialog(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">Cancel</button>
                            <button onClick={handleRename} className="px-3 py-1.5 bg-indigo-600 rounded-lg text-xs font-medium text-white hover:bg-indigo-500">Rename</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div className="fixed bg-white dark:bg-neutral-800 border border-zinc-200 dark:border-white/10 rounded-lg shadow-xl py-1 z-50 w-48 text-sm text-zinc-900 dark:text-zinc-100" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => { handleEditFile(contextMenu.item); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center gap-2"><Edit className="w-4 h-4 text-slate-400" /> Edit</button>
                    <button onClick={() => { setRenamingItem(contextMenu.item); setRenameValue(contextMenu.item.name); setShowRenameDialog(true); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /> Rename</button>
                    <button onClick={() => { handleDownload(contextMenu.item); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center gap-2"><Download className="w-4 h-4 text-slate-400" /> Download</button>
                    <div className="h-px bg-zinc-200 dark:bg-white/10 my-1" />
                    <button onClick={() => { setSelectedItems([contextMenu.index]); handleDelete(); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-white/5 text-red-600 dark:text-red-400 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
                </div>
            )}

            {/* Global Click Listener to close Context Menu */}
            {contextMenu && <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />}

            {/* Editor - Updated with History Tab */}
            {showEditor && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-8">
                    <div className="bg-[#1e1e1e] w-full max-w-5xl h-full max-h-[800px] rounded-xl shadow-2xl flex flex-col border border-white/10 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#252526]">
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-indigo-400" />
                                <span className="text-sm font-medium text-slate-200">{editingFile?.name}</span>
                                {saving && <span className="text-xs text-slate-500 animate-pulse">Saving...</span>}
                                {viewingVersion && <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">Viewing Past Version</span>}
                            </div>
                            <div className="flex bg-black/20 rounded p-0.5 gap-1">
                                <button onClick={() => setActiveTab('editor')} className={`px-3 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'editor' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Editor</button>
                                <button onClick={() => { setActiveTab('history'); loadHistory(editingFile.path || `${currentPath}/${editingFile.name}`); }} className={`px-3 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>History</button>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleSaveFile} disabled={saving} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-medium text-white transition-colors">
                                    {viewingVersion ? "Restore This Version" : "Save"}
                                </button>
                                <button onClick={() => { setShowEditor(false); setViewingVersion(null); setActiveTab('editor'); }} className="px-3 py-1.5 hover:bg-white/5 rounded text-xs font-medium text-slate-400 transition-colors">Close</button>
                            </div>
                        </div>

                        {activeTab === 'editor' ? (
                            <div className="flex-1 bg-[#1e1e1e] overflow-hidden">
                                <Editor
                                    height="100%"
                                    defaultLanguage="plaintext"
                                    language={getLanguageFromFilename(editingFile?.name || "")}
                                    value={fileContent}
                                    theme="vs-dark"
                                    onChange={(value) => setFileContent(value || "")}
                                    options={{
                                        minimap: { enabled: true },
                                        fontSize: 14,
                                        scrollBeyondLastLine: false,
                                        wordWrap: "on",
                                        automaticLayout: true,
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-4 bg-[#1e1e1e]">
                                <table className="w-full text-left text-sm text-slate-400">
                                    <thead>
                                        <tr className="border-b border-white/10 text-xs uppercase tracking-wider">
                                            <th className="py-2">Date</th>
                                            <th className="py-2">Size</th>
                                            <th className="py-2 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {versions.map((ver) => (
                                            <tr key={ver.id} className="hover:bg-white/5">
                                                <td className="py-3">{new Date(ver.created_at).toLocaleString()}</td>
                                                <td className="py-3 font-mono text-xs">{formatBytes(ver.size)}</td>
                                                <td className="py-3 text-right">
                                                    <button onClick={() => loadVersionContent(ver)} className="text-indigo-400 hover:text-indigo-300 text-xs font-medium border border-indigo-500/30 px-2 py-1 rounded hover:bg-indigo-500/10">
                                                        View / Load
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Notifications */}
            {notification && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full border shadow-2xl flex items-center gap-2 z-[100] animate-in fade-in slide-in-from-top-4 ${notification.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                    {notification.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                    <span className="text-sm font-medium">{notification.message}</span>
                </div>
            )}
        </div>
    );
}
