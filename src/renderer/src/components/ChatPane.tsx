import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@/store/chat";
import { ToolCallChip } from "./ToolCallChip";
import { cn } from "@/lib/cn";

export function ChatPane() {
  const messages = useChat((s) => s.messages);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div
      ref={scrollerRef}
      className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-3"
    >
      {messages.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-white/40">
          <p className="text-sm">Tu profe está esperando.</p>
          <p className="text-xs">
            Pedíle algo, hablá por el micrófono, o pidile que haga algo en tu compu.
          </p>
        </div>
      )}
      <AnimatePresence initial={false}>
        {messages.map((m) => {
          if (m.role === "assistant" && !m.text && m.toolCalls.length === 0)
            return null;
          return (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-[hsl(var(--accent))]/85 text-white"
                    : "bg-white/5 text-white/95 border border-white/5"
                )}
              >
                {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                {m.toolCalls.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.toolCalls.map((c) => (
                      <ToolCallChip key={c.id} call={c} />
                    ))}
                  </div>
                )}
                {m.streaming && !m.text && (
                  <span className="inline-flex h-3 items-end gap-0.5">
                    <Dot delay={0} />
                    <Dot delay={150} />
                    <Dot delay={300} />
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="inline-block h-1.5 w-1.5 rounded-full bg-white/60"
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 0.9, repeat: Infinity, delay: delay / 1000 }}
    />
  );
}
