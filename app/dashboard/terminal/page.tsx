"use client";

import dynamic from "next/dynamic";

const TerminalComponent = dynamic(() => import("./TerminalComponent"), {
    ssr: false,
});

export default function TerminalPage() {
    return <TerminalComponent />;
}
