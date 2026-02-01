"use client";

import * as React from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
    const { setTheme, theme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        // Return placeholder or null to avoid hydration mismatch
        return <div className="w-24 h-8 bg-zinc-100 dark:bg-neutral-800 rounded-lg animate-pulse" />;
    }

    return (
        <div className="flex items-center gap-1 border border-zinc-200 dark:border-white/10 rounded-lg p-1 bg-white dark:bg-neutral-800">
            <button
                type="button"
                onClick={() => setTheme("light")}
                className={`p-1.5 rounded-md transition-colors ${theme === 'light'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                    : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/5 dark:hover:text-zinc-300'}`}
                title="Light"
            >
                <Sun className="h-4 w-4" />
            </button>
            <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`p-1.5 rounded-md transition-colors ${theme === 'dark'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                    : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/5 dark:hover:text-zinc-300'}`}
                title="Dark"
            >
                <Moon className="h-4 w-4" />
            </button>
            <button
                type="button"
                onClick={() => setTheme("system")}
                className={`p-1.5 rounded-md transition-colors ${theme === 'system'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                    : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/5 dark:hover:text-zinc-300'}`}
                title="System"
            >
                <Laptop className="h-4 w-4" />
            </button>
        </div>
    );
}
