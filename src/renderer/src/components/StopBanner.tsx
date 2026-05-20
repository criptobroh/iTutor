import { motion, AnimatePresence } from "framer-motion";
import { Square } from "lucide-react";
import { useChat } from "@/store/chat";
import { useAgent } from "@/hooks/useAgent";

/**
 * Banner full-width que aparece SOLO cuando el agente está procesando.
 * Click → corta al instante: chat de Claude (server-side abort) + avatar.
 */
export function StopBanner() {
  const busy = useChat((s) => s.busy);
  const { abort } = useAgent();

  return (
    <AnimatePresence>
      {busy && (
        <motion.button
          key="stop"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          onClick={() => abort()}
          className="no-drag mx-3 mb-1 flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--danger))]/40 bg-[hsl(var(--danger))]/15 px-3 py-2 text-left text-white shadow-lg shadow-[hsl(var(--danger))]/10 backdrop-blur-md hover:bg-[hsl(var(--danger))]/25 active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-[hsl(var(--danger))]" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--danger))]" />
            </span>
            <span className="text-xs font-semibold tracking-wide">
              Profe pensando / actuando…
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--danger))] px-2 py-1 text-[11px] font-bold uppercase tracking-wider">
            <Square size={10} fill="currentColor" />
            Parar
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
