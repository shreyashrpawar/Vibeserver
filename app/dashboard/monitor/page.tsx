"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
    Activity, Server, HardDrive, Wifi,
    Cpu, ArrowUp, ArrowDown,
    List, Terminal, Home, Box, Power, RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../components/theme-toggle";

// Helper for formatting bytes
const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatBitRate = (bytes: number, decimals = 1) => {
    const bits = bytes * 8;
    if (bits === 0) return '0 bps';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];
    const i = Math.floor(Math.log(bits) / Math.log(k));
    return parseFloat((bits / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

interface ServiceStatus {
    name: string;
    display_name: string;
    status: string;
}

const ServiceManager = () => {
    const [services, setServices] = useState<ServiceStatus[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchServices();
        const interval = setInterval(fetchServices, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchServices = async () => {
        try {
            const res = await fetch("/api/monitor/services", { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setServices(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const manageService = async (name: string, action: string) => {
        if (!confirm(`${action} service ${name}?`)) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/monitor/services/${name}/${action}`, { method: 'POST', credentials: 'include' });
            if (res.ok) {
                setTimeout(fetchServices, 2000); // Wait for restart
                alert(`Service ${name} ${action}ed`);
            } else {
                alert("Action failed");
            }
        } catch (e) {
            alert("Error: " + e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-medium text-slate-100 mb-6 flex items-center gap-2">
                <Box className="w-5 h-5 text-blue-500" /> System Services
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((s) => (
                    <div key={s.name} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-blue-500/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${s.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500'}`} />
                            <div>
                                <p className="font-medium text-sm text-slate-200">{s.display_name}</p>
                                <p className="text-xs text-slate-500 capitalize">{s.status}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => manageService(s.name, 'start')} disabled={loading || s.status === 'active'} className="p-1.5 text-green-500 hover:bg-green-500/10 rounded disabled:opacity-30" title="Start"><Power className="w-4 h-4" /></button>
                            <button onClick={() => manageService(s.name, 'restart')} disabled={loading} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded disabled:opacity-30" title="Restart"><RefreshCw className="w-4 h-4" /></button>
                            <button onClick={() => manageService(s.name, 'stop')} disabled={loading || s.status !== 'active'} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded disabled:opacity-30" title="Stop"><Power className="w-4 h-4 rotate-180" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function MonitorPage() {
    const router = useRouter();
    const [connected, setConnected] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Real-time data buffer for charts (last 60 seconds)
    const [history, setHistory] = useState<any[]>([]);

    // Current stats
    const [currentStats, setCurrentStats] = useState({
        cpu: { usage: 0 },
        memory: { total: 0, used: 0 },
        disk: { total: 0, used: 0 },
        network: { rx_sec: 0, tx_sec: 0 },
        system: { uptime: 'Unknown', load: '0.00 0.00 0.00' },
        processes: [] as any[]
    });

    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws?type=monitor`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('Monitor connected');
            setConnected(true);
            setLoading(false);
            setError(null);
        };

        ws.onclose = () => {
            console.log('Monitor disconnected');
            setConnected(false);
        };

        ws.onerror = (err) => {
            console.error('Monitor WebSocket error:', err);
            setError('Connection failed.');
            setLoading(false);
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'update' && msg.data) {
                    const newData = msg.data;
                    const timestamp = new Date().toLocaleTimeString();

                    setCurrentStats(prev => ({
                        ...newData,
                        system: newData.system || prev.system,
                        processes: newData.processes || []
                    }));

                    setHistory(prev => {
                        const newHistory = [...prev, { ...newData, time: timestamp }];
                        // Keep last 30 data points (~60 seconds if 2s interval)
                        return newHistory.slice(-30);
                    });
                }
            } catch (e) {
                console.error('Failed to parse monitor message', e);
            }
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, []);

    // Calculations for UI
    const memUsagePercent = currentStats.memory.total
        ? (currentStats.memory.used / currentStats.memory.total) * 100
        : 0;

    const diskUsagePercent = currentStats.disk.total
        ? (currentStats.disk.used / currentStats.disk.total) * 100
        : 0;

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center text-slate-400">
                <Activity className="w-6 h-6 animate-spin mr-2" /> Loading Monitor...
            </div>
        );
    }

    return (
        <div className="text-zinc-900 dark:text-white font-sans p-6 pb-20 transition-colors animate-fade-in-up h-full overflow-y-auto">
            <div className="w-full space-y-6">
                {/* System Info Banner */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center">
                            <Terminal className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-slate-100 font-semibold">Local Server</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">127.0.0.1</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                        <div className="text-right">
                            <p className="text-slate-500 dark:text-slate-500 text-xs">Uptime</p>
                            <p className="text-slate-200 font-mono">{currentStats.system?.uptime || 'Unknown'}</p>
                        </div>
                        <div className="h-8 w-px bg-white/10"></div>
                        <div className="text-right">
                            <p className="text-slate-500 dark:text-slate-500 text-xs">Load Average</p>
                            <p className="text-slate-200 font-mono">{currentStats.system?.load || '0.00'}</p>
                        </div>
                    </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* CPU Card */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-violet-500/30 transition-all shadow-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Cpu className="w-16 h-16 text-violet-500" />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <Cpu className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                            <h3 className="text-sm font-medium text-slate-400">CPU Usage</h3>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white">{currentStats.cpu.usage.toFixed(1)}%</span>
                        </div>
                    </div>

                    {/* RAM Card */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-pink-500/30 transition-all shadow-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Server className="w-16 h-16 text-pink-500" />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <Server className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                            <h3 className="text-sm font-medium text-slate-400">RAM Usage</h3>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white">{memUsagePercent.toFixed(1)}%</span>
                            <span className="text-xs text-slate-500">{formatBytes(currentStats.memory.used)} / {formatBytes(currentStats.memory.total)}</span>
                        </div>
                    </div>

                    {/* Disk Card */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/30 transition-all shadow-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <HardDrive className="w-16 h-16 text-amber-500" />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <HardDrive className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                            <h3 className="text-sm font-medium text-slate-400">Disk Usage</h3>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white">{diskUsagePercent.toFixed(1)}%</span>
                            <span className="text-xs text-slate-500">{formatBytes(currentStats.disk.used)} / {formatBytes(currentStats.disk.total)}</span>
                        </div>
                    </div>

                    {/* Network Card */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Wifi className="w-16 h-16 text-emerald-500" />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <Wifi className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                            <h3 className="text-sm font-medium text-slate-400">Network I/O</h3>
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 flex items-center gap-1"><ArrowDown className="w-3 h-3" /> RX</span>
                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatBitRate(currentStats.network.rx_sec)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 flex items-center gap-1"><ArrowUp className="w-3 h-3" /> TX</span>
                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatBitRate(currentStats.network.tx_sec)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Service Manager */}
                <ServiceManager />

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* CPU History */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-medium text-slate-100 mb-6 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-violet-500" /> CPU History
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={history}>
                                    <defs>
                                        <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                                    <XAxis dataKey="time" hide />
                                    <YAxis hide domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20' }}
                                        itemStyle={{ color: '#fff' }}
                                    // Tooltip customization requires more work for light/dark; sticking to dark tooltip for contrast or could use CSS var
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="cpu.usage"
                                        stroke="#8b5cf6"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorCpu)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Network History */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-medium text-slate-100 mb-6 flex items-center gap-2">
                            <Wifi className="w-5 h-5 text-emerald-500" /> Network Activity
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={history}>
                                    <defs>
                                        <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                                    <XAxis dataKey="time" hide />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20' }}
                                        itemStyle={{ color: '#fff' }}
                                        formatter={(value: any) => formatBitRate(value)}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="network.rx_sec"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorRx)"
                                        stackId="1"
                                        name="RX"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="network.tx_sec"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        fillOpacity={0.5}
                                        fill="url(#colorTx)"
                                        stackId="1"
                                        name="TX"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Top Processes */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-medium text-slate-100 mb-6 flex items-center gap-2">
                        <List className="w-5 h-5 text-amber-500" /> Top Processes
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-slate-400">
                                    <th className="py-3 px-4 font-medium">Command</th>
                                    <th className="py-3 px-4 font-medium">PID</th>
                                    <th className="py-3 px-4 font-medium">User</th>
                                    <th className="py-3 px-4 font-medium">CPU %</th>
                                    <th className="py-3 px-4 font-medium">CPU %</th>
                                    <th className="py-3 px-4 font-medium">MEM %</th>
                                    <th className="py-3 px-4 font-medium w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {currentStats.processes && currentStats.processes.length > 0 ? (
                                    currentStats.processes.map((proc, i) => (
                                        <tr key={i} className="hover:bg-white/5 transition-colors text-slate-300 group">
                                            <td className="py-3 px-4 font-mono max-w-xs truncate" title={proc.command}>{proc.command}</td>
                                            <td className="py-3 px-4 text-slate-400">{proc.pid}</td>
                                            <td className="py-3 px-4 text-slate-400">{proc.user}</td>
                                            <td className="py-3 px-4 text-violet-400 font-bold">{proc.cpu.toFixed(1)}%</td>
                                            <td className="py-3 px-4 text-slate-300">{proc.mem.toFixed(1)}%</td>
                                            <td className="py-3 px-4">
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm(`Force kill process ${proc.pid} (${proc.command})?`)) return;
                                                        try {
                                                            const res = await fetch(`/api/monitor/kill/${proc.pid}`, { method: 'POST', credentials: 'include' });
                                                            if (!res.ok) throw new Error("Failed to kill");
                                                            // Optimistic update handled by next WS tick
                                                        } catch (e) {
                                                            alert("Failed to kill process: " + e);
                                                        }
                                                    }}
                                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all font-bold text-xs"
                                                    title="Kill Process"
                                                >
                                                    KILL
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                                            Waiting for process data...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
