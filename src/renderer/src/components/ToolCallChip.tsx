import { motion } from "framer-motion";
import { MousePointer2, Keyboard, Camera, Globe, Wrench, Check, X } from "lucide-react";
import type { ToolCall } from "@/store/chat";
import { cn } from "@/lib/cn";

function iconFor(name: string) {
  if (/screenshot|snapshot/.test(name)) return <Camera size={12} />;
  if (/mouse/.test(name)) return <MousePointer2 size={12} />;
  if (/keyboard/.test(name)) return <Keyboard size={12} />;
  if (/browser|playwright|web/.test(name)) return <Globe size={12} />;
  return <Wrench size={12} />;
}

function labelFor(name: string): string {
  // mcp__computer-use__mouse_click → "mouse_click"
  const parts = name.split("__");
  return parts[parts.length - 1].replace(/_/g, " ");
}

export function ToolCallChip({ call }: { call: ToolCall }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        call.status === "running" &&
          "border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))]/10 text-white/90",
        call.status === "ok" &&
          "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
        call.status === "error" &&
          "border-[hsl(var(--danger))]/30 bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))]"
      )}
    >
      {iconFor(call.name)}
      <span className="font-mono">{labelFor(call.name)}</span>
      {call.status === "running" && (
        <span className="relative h-1 w-6 overflow-hidden rounded-full bg-white/10">
          <span className="absolute inset-0 stripe-shimmer" />
        </span>
      )}
      {call.status === "ok" && <Check size={11} />}
      {call.status === "error" && <X size={11} />}
    </motion.div>
  );
}
