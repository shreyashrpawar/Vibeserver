"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Clock, FileText, User, Terminal as TerminalIcon, AlertCircle, RefreshCw, Home, Search, Shield } from 'lucide-react';
import { ThemeToggle } from "../../components/theme-toggle";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useTheme } from "next-themes";
import { useRef } from 'react';

interface LogEntry {
    id: number;
    user_id: number;
    user: {
        username: string;
        role: string;
    };
    action: string;
    target: string;
    details: string;
    terminal_session_id?: number;
    created_at: string;
}

interface TerminalSession {
    id: number;
    commands: string;
    output: string;
}

const TerminalViewer = ({ content }: { content: string }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();

    useEffect(() => {
        if (!terminalRef.current) return;

        const term = new Terminal({
            fontSize: 12,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: "#000000",
                foreground: "#ffffff",
            },
            convertEol: true, // Handle \n as \r\n for raw text if needed
            disableStdin: true, // Read-only
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();

        // Write content - Clean up potentially double \r\r or formatting if needed., but usually raw output is correct for xterm if it came from PTY.
        // PTY output usually contains \r\n line endings.
        term.write(content);

        return () => {
            term.dispose();
        };
    }, []); // Run once on mount

    return <div ref={terminalRef} className="h-full w-full" />;
};

export default function ActivityLogsPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [viewSession, setViewSession] = useState<TerminalSession | null>(null);
    const [fetchingSession, setFetchingSession] = useState(false);
    const [role, setRole] = useState('user'); // assume user, fetch checks real role

    useEffect(() => {
        fetchLogs();
        fetchMe();
    }, []);

    const fetchMe = async () => {
        try {
            const res = await fetch("/api/me", { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setRole(data.role);
            }
        } catch (e) {
            console.error(e);
        }
    }

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/logs", { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
                // Try to guess role from logs or separate /me call. 
                // Since we don't have /me here easily, we rely on what the backend returned.
                // If backend returns logs for other users, we are likely admin.
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSession = async (sessionId: number) => {
        setFetchingSession(true);
        try {
            const res = await fetch(`/api/sessions/${sessionId}`, { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setViewSession(data);
            } else {
                alert("Failed to load session content");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setFetchingSession(false);
        }
    };

    const getIconForAction = (action: string) => {
        if (action.includes("LOGIN")) return <User className="w-4 h-4 text-green-500" />;
        if (action.includes("FILE")) return <FileText className="w-4 h-4 text-blue-500" />;
        if (action.includes("TERMINAL")) return <TerminalIcon className="w-4 h-4 text-yellow-500" />;
        if (action.includes("USER")) return <Shield className="w-4 h-4 text-purple-500" />;
        return <Activity className="w-4 h-4 text-slate-500" />;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
    };

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(filter.toLowerCase()) ||
        log.target.toLowerCase().includes(filter.toLowerCase()) ||
        log.user?.username.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col font-sans transition-colors p-6">
            <div className="w-full space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between bg-white/50 dark:bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-white/5">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Logs</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Track all actions performed on the server.</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="w-full bg-white dark:bg-neutral-800 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 transition-colors shadow-sm"
                        />
                    </div>
                    <button onClick={fetchLogs} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Logs Table */}
                <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                            <thead className="bg-gray-50 dark:bg-neutral-900/50 text-xs uppercase text-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">User</th>
                                    <th className="px-6 py-4 font-semibold">Action</th>
                                    <th className="px-6 py-4 font-semibold">Message</th>
                                    <th className="px-6 py-4 font-semibold">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                            {loading ? "Loading..." : "No activity recorded."}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-neutral-700/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                                        {log.user?.username.substring(0, 1).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-gray-900 dark:text-white">{log.user?.username}</span>
                                                    {log.user?.role === 'admin' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">ADMIN</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {getIconForAction(log.action)}
                                                    <span className="font-mono text-xs">{log.action}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium text-gray-900 dark:text-white">{log.target}</span>
                                                    <span className="text-xs text-slate-500 truncate max-w-xs">{log.details}</span>
                                                    {log.terminal_session_id && (
                                                        <button
                                                            onClick={() => fetchSession(log.terminal_session_id!)}
                                                            className="self-start text-[10px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                                                        >
                                                            View Output
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs whitespace-nowrap">
                                                <div className="flex items-center justify-between gap-4">
                                                    <span>{formatDate(log.created_at)}</span>
                                                    {role === 'admin' && (
                                                        <button
                                                            onClick={async () => {
                                                                if (!confirm("Delete this log?")) return;
                                                                await fetch(`/api/logs/${log.id}`, { method: 'DELETE', credentials: 'include' });
                                                                fetchLogs();
                                                            }}
                                                            className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Delete Log"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Session Output Modal */}
                {viewSession && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setViewSession(null)}>
                        <div className="bg-zinc-900 w-full max-w-4xl h-[80vh] rounded-xl overflow-hidden flex flex-col shadow-2xl border border-zinc-700" onClick={e => e.stopPropagation()}>
                            <div className="bg-zinc-800 px-4 py-3 border-b border-zinc-700 flex justify-between items-center">
                                <h3 className="text-sm font-medium text-gray-200">Terminal Output (Session #{viewSession.id})</h3>
                                <button onClick={() => setViewSession(null)} className="text-gray-400 hover:text-white">✕</button>
                            </div>
                            <div className="flex-1 overflow-hidden bg-black p-2">
                                {/* Use Key to force remount on new session */}
                                <TerminalViewer key={viewSession.id} content={viewSession.output} />
                            </div>
                            <div className="bg-zinc-800 px-4 py-2 border-t border-zinc-700 text-xs text-gray-500">
                                Commands: {viewSession.commands}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
