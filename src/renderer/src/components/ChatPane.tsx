import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { useChat } from "@/store/chat";
import { ToolCallChip } from "./ToolCallChip";
import { MessageMarkdown } from "./MessageMarkdown";
import { copyRichText, nodeHtml } from "@/lib/copy";
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
              {m.role === "user" ? (
                <UserBubble text={m.text} />
              ) : (
                <AssistantBubble
                  text={m.text}
                  streaming={m.streaming}
                  toolCalls={m.toolCalls}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="max-w-[85%] rounded-2xl bg-[hsl(var(--accent))]/85 px-3.5 py-2.5 text-sm leading-relaxed text-white">
      <p className="whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function AssistantBubble({
  text,
  streaming,
  toolCalls,
}: {
  text: string;
  streaming: boolean;
  toolCalls: any[];
}) {
  const mdRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const showThinking = streaming && !text;

  const onCopy = async () => {
    const ok = await copyRichText({
      plain: text,
      html: nodeHtml(mdRef.current),
    });
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };

  return (
    <div className="max-w-[88%] rounded-2xl border border-white/5 bg-white/5 px-3.5 py-2.5 text-sm leading-relaxed text-white/95">
      {text && <MessageMarkdown ref={mdRef} text={text} />}
      {toolCalls.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {toolCalls.map((c) => (
            <ToolCallChip key={c.id} call={c} />
          ))}
        </div>
      )}
      {showThinking && (
        <span className="inline-flex h-3 items-end gap-0.5">
          <Dot delay={0} />
          <Dot delay={150} />
          <Dot delay={300} />
        </span>
      )}
      {text && !streaming && (
        <div className="mt-2 flex justify-end border-t border-white/5 pt-2">
          <button
            onClick={onCopy}
            className={cn(
              "inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[10px] font-medium text-white/55 transition-colors",
              "hover:bg-white/5 hover:text-white",
              copied && "text-[hsl(var(--success))] hover:text-[hsl(var(--success))]"
            )}
            title="Copiar con formato (HTML + texto plano)"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            <span>{copied ? "Copiado" : "Copiar"}</span>
          </button>
        </div>
      )}
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
