import { useEffect } from "react";
import { motion } from "framer-motion";
import { useHeyGen } from "@/hooks/useHeyGen";
import { useAgent } from "@/hooks/useAgent";
import { Loader2, AlertCircle } from "lucide-react";

interface AvatarStageProps {
  avatarId: string;
  language: string;
  enabled: boolean;
}

export function AvatarStage({ avatarId, language, enabled }: AvatarStageProps) {
  const heygen = useHeyGen({ avatarId, language, enabled });
  // Conectá el stream Claude a la voz del avatar.
  useAgent({ onAssistantText: heygen.speak });

  useEffect(() => () => heygen.interrupt(), [heygen]);

  return (
    <div className="relative mx-3 mt-2 aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      <video
        ref={heygen.videoRef}
        autoPlay
        playsInline
        muted={false}
        className="h-full w-full object-cover"
      />
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
            Avatar offline. {heygen.errorMsg ?? "Revisá HEYGEN_API_KEY en .env."}
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
