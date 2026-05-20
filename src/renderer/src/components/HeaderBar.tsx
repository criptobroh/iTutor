import { Pin, PinOff, X, ShieldAlert, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";

export function HeaderBar() {
  const [pinned, setPinned] = useState(true);
  const [killOn, setKillOn] = useState(false);

  useEffect(() => {
    window.iTutor.killSwitch.state().then(setKillOn);
    return window.iTutor.killSwitch.onChange(setKillOn);
  }, []);

  return (
    <div className="drag-region flex h-11 items-center justify-between px-3 select-none">
      <div className="flex items-center gap-2 pl-2">
        <div className="relative flex h-2.5 w-2.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-[hsl(var(--accent))] opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--accent))]" />
        </div>
        <span className="text-xs font-semibold tracking-wide text-white/90">
          iTutor
        </span>
      </div>
      <div className="no-drag flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7",
            killOn && "text-[hsl(var(--danger))] hover:text-[hsl(var(--danger))]"
          )}
          title={killOn ? "Kill switch ACTIVO — click para desactivar" : "Kill switch — bloquea mouse/teclado"}
          onClick={() => window.iTutor.killSwitch.toggle()}
        >
          {killOn ? <ShieldAlert size={14} /> : <Shield size={14} />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title={pinned ? "Desfijar" : "Fijar al frente"}
          onClick={() => {
            const next = !pinned;
            setPinned(next);
            window.iTutor.window.pin(next);
          }}
        >
          {pinned ? <Pin size={14} /> : <PinOff size={14} />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Ocultar (Cmd+Space)"
          onClick={() => window.iTutor.window.hide()}
        >
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}
