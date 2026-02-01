import Link from "next/link";
import { Terminal, ShieldCheck, Download, HardDrive, Zap, Monitor, Bot, Sparkles } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen text-white selection:bg-blue-500/30">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <Terminal className="w-5 h-5 text-white" />
                        </div>
                        Vibeserver
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
                        <Link href="#features" className="hover:text-white transition-colors">Features</Link>
                        <Link href="#comparison" className="hover:text-white transition-colors">Compare</Link>
                        <Link href="https://github.com/shreyashrpawar/Vibeserver" className="hover:text-white transition-colors">GitHub</Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <a
                            href="https://github.com/shreyashrpawar/Vibeserver/releases"
                            className="bg-white text-black px-4 py-2 rounded-full text-sm font-semibold hover:bg-zinc-200 transition-colors"
                        >
                            Download
                        </a>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -z-10" />
                <div className="container mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-blue-400 mb-8 animate-fade-in-up">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        v1.0.0 Now Available
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                        Your Server.<br />
                        Fully Controlled.
                    </h1>
                    <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        A beautiful, self-hosted infrastructure manager. <br className="hidden md:block" />
                        Control your VPS with a premium web terminal, file manager, and system monitor.
                    </p>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                        <a
                            href="https://github.com/shreyashrpawar/Vibeserver/releases/download/v1.0.0/vibeserver"
                            className="group relative flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                        >
                            <Download className="w-5 h-5" />
                            Download Binary
                        </a>
                    </div>

                    <div className="mt-12 bg-zinc-900/50 border border-white/10 rounded-xl p-6 max-w-2xl mx-auto backdrop-blur-sm text-left">
                        <p className="text-zinc-400 text-sm mb-3 font-semibold uppercase tracking-wider">Quick Install</p>
                        <div className="font-mono text-sm bg-black/50 p-4 rounded-lg text-zinc-300 overflow-x-auto selection:bg-blue-500/30">
                            <span className="select-none text-zinc-600">$ </span>
                            wget -O install.sh https://raw.githubusercontent.com/shreyashrpawar/Vibeserver/main/install.sh && chmod +x install.sh && sudo ./install.sh
                        </div>
                    </div>

                    {/* Screenshot / Demo Placeholder */}
                    <div className="mt-20 relative mx-auto max-w-5xl rounded-xl border border-white/10 bg-black/50 shadow-2xl backdrop-blur-sm overflow-hidden p-2">
                        <div className="aspect-[16/9] w-full bg-zinc-900/80 rounded-lg overflow-hidden relative group border border-white/10">
                            {/* Mock Dashboard UI */}
                            <div className="absolute inset-0 flex">
                                {/* Sidebar */}
                                <div className="w-64 border-r border-white/10 bg-zinc-950/50 p-4 hidden md:block">
                                    <div className="space-y-3">
                                        <div className="h-8 w-full bg-white/10 rounded animate-pulse"></div>
                                        <div className="h-4 w-1/2 bg-white/5 rounded"></div>
                                        <div className="h-4 w-3/4 bg-white/5 rounded"></div>
                                        <div className="h-4 w-2/3 bg-white/5 rounded"></div>
                                    </div>
                                </div>
                                {/* Content */}
                                <div className="flex-1 p-8 grid grid-cols-2 gap-6 bg-zinc-900/30">
                                    <div className="h-32 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 p-5 flex flex-col justify-between shadow-lg">
                                        <div className="h-10 w-10 rounded-lg bg-blue-500/30 flex items-center justify-center">
                                            <div className="h-5 w-5 bg-blue-400 rounded-sm"></div>
                                        </div>
                                        <div className="h-4 w-24 bg-white/10 rounded"></div>
                                    </div>
                                    <div className="h-32 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 p-5 flex flex-col justify-between shadow-lg">
                                        <div className="h-10 w-10 rounded-lg bg-emerald-500/30 flex items-center justify-center">
                                            <div className="h-5 w-5 bg-emerald-400 rounded-sm"></div>
                                        </div>
                                        <div className="h-4 w-24 bg-white/10 rounded"></div>
                                    </div>
                                    <div className="col-span-2 h-full rounded-xl bg-black/80 border border-white/10 p-4 font-mono text-sm relative overflow-hidden group-hover:border-white/20 transition-colors">
                                        <div className="absolute top-0 left-0 w-full h-6 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                                            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                            <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                                            <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                                        </div>
                                        <div className="mt-8 space-y-1 text-green-400">
                                            <p><span className="text-blue-400">root@vibeserver</span>:<span className="text-purple-400">~</span>$ vibeserver status</p>
                                            <div className="pl-4 text-zinc-400 border-l-2 border-zinc-800">
                                                <p>Checking system resources...</p>
                                                <p>[OK] CPU Usage: 12%</p>
                                                <p>[OK] Memory: 4.2GB / 16GB</p>
                                                <p>[OK] Disk: 45% used</p>
                                            </div>
                                            <p><span className="text-blue-400">root@vibeserver</span>:<span className="text-purple-400">~</span>$ <span className="animate-pulse">_</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Badge */}
                            <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur border border-white/10 px-3 py-1 rounded-full text-xs font-mono text-white/70 shadow-xl">
                                Live Dashboard Preview
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section - Bento Grid */}
            <section id="features" className="py-24 bg-zinc-950 relative overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] -z-10" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -z-10" />

                <div className="container mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-to-br from-white via-white to-white/50 bg-clip-text text-transparent">
                            Beyond standard controls.
                        </h2>
                        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                            Powerful tools engineered for user-friendly DevOps, wrapped in a beautiful interface.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                        {/* Monitor - Large Box (4 cols) */}
                        <div className="md:col-span-4 p-8 rounded-3xl bg-zinc-900/50 border border-white/10 hover:border-white/20 transition-all group overflow-hidden relative min-h-[300px] flex flex-col justify-between">
                            {/* Abstract UI Background */}
                            <div className="absolute top-0 right-0 w-2/3 h-full opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                                <div className="absolute right-10 top-10 flex gap-4">
                                    <div className="w-24 h-24 rounded-full border-4 border-blue-500/20" />
                                    <div className="w-24 h-24 rounded-full border-4 border-purple-500/20" />
                                </div>
                            </div>

                            <div className="relative z-10">
                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-6 border border-blue-500/20">
                                    <Monitor className="w-6 h-6 text-blue-400" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3 text-white">Real-time Telemetry</h3>
                                <p className="text-zinc-400 max-w-sm text-base leading-relaxed">
                                    Visualize CPU, Memory, Disk overlay, and Network traffic with precision 1-second interval updates.
                                </p>
                            </div>

                            {/* Mini Chart Concept */}
                            <div className="mt-8 flex items-end gap-2 h-16 w-full max-w-xs opacity-50 group-hover:opacity-100 transition-opacity">
                                {[40, 70, 45, 90, 60, 80, 50, 70, 55, 65].map((h, i) => (
                                    <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-gradient-to-t from-blue-600/50 to-blue-400/50 rounded-sm"></div>
                                ))}
                            </div>
                        </div>

                        {/* Terminal - Tall Box (2 cols) */}
                        <div className="md:col-span-2 p-8 rounded-3xl bg-zinc-900/50 border border-white/10 hover:border-white/20 transition-all group relative overflow-hidden min-h-[300px]">
                            <div className="absolute -right-10 -bottom-10 opacity-[0.02] rotate-12 group-hover:opacity-[0.05] transition-opacity">
                                <Terminal className="w-64 h-64" />
                            </div>
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6 border border-purple-500/20">
                                    <Terminal className="w-6 h-6 text-purple-400" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3 text-white">Web Terminal</h3>
                                <p className="text-zinc-400 text-base leading-relaxed mb-8">
                                    Full xterm.js shell support with zsh/bash compatibility directly in your browser.
                                </p>
                                <div className="mt-auto font-mono text-xs text-zinc-500 bg-black/50 p-3 rounded-lg border border-white/5">
                                    <span className="text-green-500">➜</span> <span className="text-blue-400">~</span> apt update && upgrade
                                </div>
                            </div>
                        </div>

                        {/* File Manager - (3 cols) */}
                        <div className="md:col-span-3 p-8 rounded-3xl bg-zinc-900/50 border border-white/10 hover:border-white/20 transition-all group min-h-[250px] relative overflow-hidden">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-500/20"></div>
                                    <div className="w-2 h-2 rounded-full bg-yellow-500/20"></div>
                                    <div className="w-2 h-2 rounded-full bg-green-500/20"></div>
                                </div>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-6 border border-emerald-500/20">
                                <HardDrive className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-white">File System</h3>
                            <p className="text-zinc-400 text-sm">
                                Pro Monaco (VS Code) editor with syntax highlighting and drag & drop uploads.
                            </p>
                        </div>

                        {/* Service Manager - (3 cols) */}
                        <div className="md:col-span-3 p-8 rounded-3xl bg-zinc-900/50 border border-white/10 hover:border-white/20 transition-all group min-h-[250px]">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center mb-6 border border-orange-500/20">
                                <Zap className="w-6 h-6 text-orange-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-white">Services</h3>
                            <p className="text-zinc-400 text-sm">
                                Manage Docker containers, Nginx sites, and systemd units instantly.
                            </p>
                        </div>

                        {/* AI Assistant - (4 cols - New) */}
                        <div className="md:col-span-4 p-8 rounded-3xl bg-gradient-to-br from-indigo-900/20 to-blue-900/10 border border-indigo-500/20 hover:border-indigo-400/40 transition-all group min-h-[250px] relative overflow-hidden">
                            <div className="absolute -right-8 -bottom-8 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity rotate-12">
                                <Bot className="w-48 h-48" />
                            </div>
                            <div className="relative z-10">
                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center mb-6 border border-indigo-500/20">
                                    <Sparkles className="w-6 h-6 text-indigo-400" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 text-white flex items-center gap-2">
                                    Server Genius
                                    <span className="text-[10px] uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">New</span>
                                </h3>
                                <p className="text-zinc-400 text-sm max-w-md">
                                    Integrated AI assistant powered by Gemini. Ask "Why is CPU high?" or "Explain this error log" and get instant, context-aware answers based on your live system data.
                                </p>
                            </div>
                        </div>

                        {/* Security (2 cols - Moved) */}
                        <div className="md:col-span-2 p-8 rounded-3xl bg-zinc-900/50 border border-white/10 hover:border-white/20 transition-all group min-h-[250px]">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center mb-6 border border-pink-500/20">
                                <ShieldCheck className="w-6 h-6 text-pink-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-white">Access Control</h3>
                            <p className="text-zinc-400 text-sm">
                                Granular permissions for team collaboration and comprehensive audit logs.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Comparison Section */}
            <section id="comparison" className="py-24 relative">
                {/* Glow Effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] -z-10" />

                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold tracking-tight mb-4 inline-block bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            Why Choose Vibeserver?
                        </h2>
                    </div>

                    {/* Glass Container */}
                    <div className="max-w-4xl mx-auto rounded-3xl p-1 border border-white/10 bg-white/5 backdrop-blur-xl">
                        <div className="bg-black/40 rounded-[20px] p-8">
                            <div className="grid grid-cols-3 gap-4 text-center mb-8 border-b border-white/5 pb-6 font-semibold tracking-wide text-zinc-400 uppercase text-xs">
                                <div className="text-left pl-4">Feature</div>
                                <div>Traditional Panels</div>
                                <div className="text-blue-400">Vibeserver</div>
                            </div>
                            <div className="space-y-2">
                                <CompareRow feature="UI/UX Interface" competitor="Cluttered & Dated" vibeserver="Modern & Fluid" />
                                <CompareRow feature="Terminal Experience" competitor="Basic Console" vibeserver="Rich, Recorded & Auto-complete" />
                                <CompareRow feature="Installation" competitor="Complex Dependencies" vibeserver="Single Binary File" />
                                <CompareRow feature="File Editor" competitor="Plain Text Area" vibeserver="Monaco (VS Code) Engine" />
                                <CompareRow feature="AI Assistant" competitor="None" vibeserver="Server Genius (Context Aware)" />
                                <CompareRow feature="Resource Usage" competitor="Heavy (Python/Perl)" vibeserver="Lightweight (Go)" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-black py-12 border-t border-white/10">
                <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2 font-bold text-lg text-zinc-400">
                        <div className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center">
                            <Terminal className="w-3 h-3 text-white" />
                        </div>
                        Vibeserver
                    </div>
                    <p className="text-zinc-600 text-sm">
                        © 2026 Vibeserver. Open Source Infrastructure Manager.
                    </p>
                </div>
            </footer>
        </div>
    );
}



function CompareRow({ feature, competitor, vibeserver }: { feature: string, competitor: string, vibeserver: string }) {
    return (
        <div className="grid grid-cols-3 gap-4 text-center items-center py-4 hover:bg-white/5 transition-colors rounded-lg group cursor-default">
            <div className="font-medium text-zinc-300 text-left pl-4 group-hover:text-white transition-colors">{feature}</div>
            <div className="text-zinc-500 text-sm group-hover:text-zinc-400 transition-colors">{competitor}</div>
            <div className="text-blue-400 font-medium group-hover:text-blue-300 transition-colors shadow-blue-500/20">{vibeserver}</div>
        </div>
    )
}
