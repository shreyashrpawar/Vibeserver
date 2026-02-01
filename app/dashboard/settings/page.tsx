"use client";

import { useEffect, useState } from "react";
import { Save, Lock, Bot } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        GEMINI_API_KEY: "",
        AI_MODEL: "gemini-1.5-flash"
    });
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetch("/api/settings", { credentials: "include" })
            .then(res => {
                if (res.status === 401 || res.status === 403) {
                    router.push("/dashboard"); // Redirect non-admins
                    return null;
                }
                return res.json();
            })
            .then(data => {
                if (data) {
                    setSettings({
                        GEMINI_API_KEY: data.GEMINI_API_KEY || "",
                        AI_MODEL: data.AI_MODEL || "gemini-1.5-flash"
                    });
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [router]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage("");

        try {
            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
                credentials: "include"
            });

            if (res.ok) {
                setMessage("Settings saved successfully!");
                setTimeout(() => setMessage(""), 3000);
            } else {
                setMessage("Failed to save settings.");
            }
        } catch (err) {
            setMessage("Error saving settings.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-slate-500">Loading settings...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up p-6 md:p-8">
            <div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">System Settings</h1>
                <p className="text-slate-500 dark:text-slate-400">Configure global application preferences and integrations.</p>
            </div>

            <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-zinc-200 dark:border-white/5 pb-4">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Bot className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">AI Assistant Configuration</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Powered by Google Gemini</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Gemini API Key
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="password"
                                value={settings.GEMINI_API_KEY}
                                onChange={e => setSettings({ ...settings, GEMINI_API_KEY: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2 text-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                                placeholder="sk-..."
                            />
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                            Get your free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-indigo-500 hover:underline">Google AI Studio</a>.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            AI Model
                        </label>
                        <select
                            value={settings.AI_MODEL}
                            onChange={e => setSettings({ ...settings, AI_MODEL: e.target.value })}
                            className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-4 py-2 text-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500 [&>option]:bg-white [&>option]:dark:bg-slate-900"
                        >
                            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast & Stable)</option>
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash (Latest Stable)</option>
                            <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Low Cost)</option>
                            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        </select>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                        <span className={`text-sm font-medium ${message.includes("success") ? "text-green-500" : "text-red-500"}`}>
                            {message}
                        </span>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
