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
    <div className="drag-region relative flex h-11 items-center px-3 select-none">
      {/* Título centrado absoluto — los botones de la derecha no descentran el texto */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex h-11 items-center justify-center">
        <span className="text-[13px] font-semibold tracking-[0.02em] text-white/95">
          <span className="text-white/55">IEB</span>{" "}
          <span className="text-white">iTutor</span>
        </span>
      </div>
      <div className="no-drag ml-auto flex items-center gap-1">
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
