"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Terminal, LayoutDashboard, Folder, FileText, Globe, LogOut, Settings, Activity, HardDrive, Menu } from 'lucide-react';
import { useState } from "react";
import { ThemeToggle } from "../components/theme-toggle";
import AIChat from "./components/AIChat";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navItems = [
        { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { name: "Monitor", href: "/dashboard/monitor", icon: Activity },
        { name: "Terminal", href: "/dashboard/terminal", icon: Terminal },
        { name: "File Manager", href: "/dashboard/files", icon: HardDrive },
        { name: "Logs", href: "/dashboard/logs", icon: FileText },
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ];

    const handleLogout = async () => {
        try {
            await fetch("/api/logout", { method: "POST" });
            window.location.href = "/login";
        } catch (e) {
            console.error("Logout failed", e);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-neutral-950 text-slate-900 dark:text-slate-50 transition-colors">
            {/* Sidebar  */}
            <aside className="hidden md:flex flex-col w-64 border-r border-zinc-200 dark:border-white/10 bg-white dark:bg-slate-950/50 backdrop-blur-xl transition-colors">
                <div className="p-6 flex items-center gap-3 border-b border-zinc-200 dark:border-white/5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Terminal className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-zinc-900 dark:text-white">Vibeserver</span>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                  ${isActive
                                        ? "bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-600/20 shadow-sm"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-zinc-100 dark:hover:bg-white/5"
                                    }`}
                            >
                                <item.icon className={`w-4 h-4 transition-colors ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"}`} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-zinc-200 dark:border-white/5 space-y-1">
                    <div className="px-3 pb-2">
                        <ThemeToggle />
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside >

            {/* Main Content Area */}
            < div className="flex-1 flex flex-col min-w-0 overflow-hidden relative" >
                {/* Mobile Header */}
                < header className="md:hidden flex items-center justify-between p-4 border-b border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 backdrop-blur-md z-50" >
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                            <Terminal className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg text-zinc-900 dark:text-white">Vibeserver</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white">
                        <Menu className="w-6 h-6" />
                    </button>
                </header >

                {/* Mobile Sidebar Overlay */}
                {
                    isMobileMenuOpen && (
                        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                            <div className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 border-l border-zinc-200 dark:border-white/10 p-4" onClick={(e) => e.stopPropagation()}>
                                <nav className="space-y-2 mt-12">
                                    {navItems.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                          ${pathname === item.href ? "bg-blue-600/10 text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"}`}
                                        >
                                            <item.icon className="w-5 h-5" />
                                            {item.name}
                                        </Link>
                                    ))}
                                    <div className="mt-4 px-4"><ThemeToggle /></div>
                                    <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 mt-4 border-t border-zinc-200 dark:border-white/10 pt-4">
                                        <LogOut className="w-5 h-5" />
                                        Sign Out
                                    </button>
                                </nav>
                            </div>
                        </div>
                    )
                }

                {/* Content Scrollable Area */}
                <main className="flex-1 overflow-auto relative bg-zinc-50 dark:bg-transparent">
                    {/* Background Glows for visual depth - Dark mode only? */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 dark:bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 dark:bg-purple-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />

                    <div className="h-full w-full">
                        {children}
                    </div>
                </main>
                <AIChat />
            </div >
        </div >
    );
}
