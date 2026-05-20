import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, Square } from "lucide-react";
import { Button } from "./ui/button";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useAgent } from "@/hooks/useAgent";
import { useChat } from "@/store/chat";
import { cn } from "@/lib/cn";

export function Composer() {
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const voice = useVoiceInput();
  const { send, abort } = useAgent();
  const busy = useChat((s) => s.busy);

  // Auto-resize textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [text]);

  const submit = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    await send(t);
  };

  // Push-to-talk: hold Space cuando no estás tipeando texto
  useEffect(() => {
    let pressed = false;
    const onDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return;
      if (e.code === "Space" && !pressed) {
        pressed = true;
        e.preventDefault();
        voice.start();
      }
    };
    const onUp = async (e: KeyboardEvent) => {
      if (e.code === "Space" && pressed) {
        pressed = false;
        e.preventDefault();
        const txt = await voice.stop();
        if (txt) {
          await send(txt);
        }
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [voice, send]);

  return (
    <div className="no-drag flex items-end gap-2 border-t border-white/5 bg-black/20 px-3 py-2.5">
      <Button
        size="icon"
        variant={voice.recording ? "danger" : "soft"}
        className="h-9 w-9 shrink-0"
        title={voice.recording ? "Soltá para enviar" : "Mantené Espacio o tocá para hablar"}
        onMouseDown={() => voice.start()}
        onMouseUp={async () => {
          const txt = await voice.stop();
          if (txt) await send(txt);
        }}
      >
        {voice.recording ? <Square size={14} /> : voice.transcribing ? <MicOff size={14} /> : <Mic size={14} />}
      </Button>
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          voice.recording
            ? "Escuchándote…"
            : voice.transcribing
              ? "Transcribiendo…"
              : "Decile algo a tu profe, o pidele que haga algo en tu compu"
        }
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape" && busy) {
            abort();
          }
        }}
        rows={1}
        className={cn(
          "min-h-[36px] flex-1 resize-none rounded-xl border border-white/5 bg-white/5",
          "px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none",
          "focus:border-[hsl(var(--accent))]/40 focus:bg-white/[0.07]"
        )}
      />
      <Button
        size="icon"
        variant={busy ? "danger" : "default"}
        className="h-9 w-9 shrink-0"
        title={busy ? "Detener (Esc)" : "Enviar (Enter)"}
        onClick={busy ? abort : submit}
        disabled={!busy && !text.trim()}
      >
        {busy ? <Square size={14} /> : <Send size={14} />}
      </Button>
    </div>
  );
}
