import { useEffect } from "react";
import { motion } from "framer-motion";
import { useHeyGen } from "@/hooks/useHeyGen";
import { Loader2, AlertCircle, Sparkles, Power } from "lucide-react";
import { Button } from "./ui/button";

interface AvatarStageProps {
  avatarId: string;
  language: string;
  enabled: boolean;
}

export function AvatarStage({ avatarId, language, enabled }: AvatarStageProps) {
  const heygen = useHeyGen({ avatarId, language, enabled });
  // Importante: NO conectamos el stream Claude al avatar. El avatar queda
  // muteado para no consumir créditos de TTS. Solo aparece como video pasivo
  // si Pablo lo enciende manualmente. La info útil va por el chat con
  // markdown rico (más fácil de copiar/pegar en mails o docs).

  useEffect(() => () => heygen.interrupt(), [heygen]);

  const isLive =
    heygen.status === "ready" ||
    heygen.status === "speaking" ||
    heygen.status === "connecting";

  return (
    <div className="relative mx-3 mt-2 aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      <video
        ref={heygen.videoRef}
        autoPlay
        playsInline
        muted={false}
        className="h-full w-full object-cover"
      />

      {/* Estado "idle": profe descansando, sin sesión activa, sin gastar créditos */}
      {heygen.status === "idle" && (
        <DormantOverlay onWake={() => void heygen.startManually()} />
      )}
      {heygen.status === "connecting" && (
        <Overlay>
          <Loader2 className="animate-spin" size={20} />
          <span className="text-xs">Conectando profe…</span>
        </Overlay>
      )}
      {heygen.status === "error" && (
        <Overlay tint="danger">
          <AlertCircle size={20} />
          <span className="text-xs text-center px-4">
            Avatar offline. {heygen.errorMsg ?? "Revisá LIVEAVATAR_API_KEY en .env."}
          </span>
        </Overlay>
      )}
      {heygen.status === "speaking" && (
        <motion.div
          className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--accent-2))]"
          animate={{ scaleX: [0.3, 1, 0.6, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          style={{ transformOrigin: "left" }}
        />
      )}

      {/* Mini-control en esquina cuando hay sesión: botón apagar */}
      {isLive && (
        <button
          onClick={() => void heygen.stopManually()}
          className="absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white/70 backdrop-blur transition hover:bg-black/60 hover:text-white"
          title="Apagar profe (ahorra créditos)"
        >
          <Power size={11} />
        </button>
      )}
    </div>
  );
}

function DormantOverlay({ onWake }: { onWake: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-black/20 via-black/40 to-black/70 text-white/85 backdrop-blur-[2px]">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/55">
        <Sparkles size={12} />
        <span>Profe en pausa</span>
      </div>
      <p className="px-6 text-center text-xs text-white/70">
        El profe está callado para ahorrar créditos. El chat de abajo tiene la
        info copiable. Si querés verlo en vivo, encendélo (cuesta créditos por
        minuto aunque no hable).
      </p>
      <Button
        variant="soft"
        size="sm"
        onClick={onWake}
        className="mt-1 h-7 text-[11px]"
      >
        Encender video del profe
      </Button>
    </div>
  );
}

function Overlay({
  children,
  tint = "muted",
}: {
  children: React.ReactNode;
  tint?: "muted" | "danger";
}) {
  return (
    <div
      className={
        "absolute inset-0 flex flex-col items-center justify-center gap-2 backdrop-blur-sm " +
        (tint === "danger"
          ? "bg-[hsl(var(--danger))]/15 text-[hsl(var(--danger))]"
          : "bg-black/40 text-white/80")
      }
    >
      {children}
    </div>
  );
}
