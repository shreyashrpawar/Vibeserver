"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Minimize2 } from "lucide-react";

interface Message {
    role: "user" | "ai";
    content: string;
}

export default function AIChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: "ai", content: "Hello! I'm Server Genius. I can see your server logs and stats. How can I help?" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { role: "user", content: userMsg }]);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg }),
                credentials: "include"
            });

            const data = await res.json();
            if (res.ok) {
                setMessages(prev => [...prev, { role: "ai", content: data.reply }]);
            } else {
                setMessages(prev => [...prev, { role: "ai", content: "Error: " + (data.message || "Failed to contact AI.") }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: "ai", content: "Error: Could not reach server." }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl transition-transform hover:scale-105 z-50 flex items-center gap-2 group border border-indigo-400/50"
            >
                <Bot className="w-6 h-6" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-medium pl-0 group-hover:pl-2">
                    Server Genius
                </span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-48px)] h-[500px] max-h-[calc(100vh-100px)] bg-white dark:bg-slate-900 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
            {/* Header */}
            <div className="p-4 bg-indigo-600 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Bot className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Server Genius</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                            <span className="text-[10px] opacity-80 font-medium">Online • Gemini 1.5</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white" title="Minimize">
                        <Minimize2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-red-500/20 hover:text-red-200 rounded-lg transition-colors text-white/80" title="Close">
                        <X className="w-4 h-4" />
                    </button> // Wait, X should prob just close (minimize state) or reset? Just hide.
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-black/20">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "ai" ? "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                            {msg.role === "ai" ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                        </div>
                        <div className={`rounded-2xl p-3 text-sm max-w-[80%] leading-relaxed shadow-sm ${msg.role === "ai" ? "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-zinc-200 dark:border-white/5 rounded-tl-none" : "bg-indigo-600 text-white rounded-tr-none"}`}>
                            {msg.content} {/* We should render markdown? For now simple text */}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/10 flex items-center justify-center shrink-0">
                            <Bot className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="bg-white dark:bg-slate-800 border border-zinc-200 dark:border-white/5 rounded-2xl rounded-tl-none p-4 flex gap-1 items-center shadow-sm">
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 bg-white dark:bg-slate-900 border-t border-zinc-200 dark:border-white/10 shrink-0">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about logs, stats..."
                        className="w-full bg-zinc-100 dark:bg-black/20 text-zinc-900 dark:text-white placeholder-slate-500 text-sm rounded-xl py-3 pl-4 pr-12 border-none focus:ring-2 focus:ring-indigo-500/50"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
}
