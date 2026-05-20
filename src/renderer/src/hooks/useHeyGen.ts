import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveAvatarSession,
  SessionEvent,
  AgentEventsEnum,
} from "@heygen/liveavatar-web-sdk";

type Status =
  | "idle" // sesión cerrada (no se cobran créditos)
  | "connecting" // mintiendo token + WebRTC handshake
  | "ready" // sesión viva, esperando texto
  | "speaking" // hablando
  | "error";

interface UseHeyGenOpts {
  avatarId?: string;
  language?: string;
  enabled?: boolean;
  /** Cuánto esperar después del último chunk antes de cerrar la sesión. */
  idleTimeoutMs?: number;
}

/**
 * Sesión LiveAvatar lazy + auto-close por inactividad.
 *
 * Filosofía:
 *  - **No abre sesión al montar** (eso quemaría créditos sin uso).
 *  - El primer `speak(chunk)` levanta la sesión y bufferea el texto hasta que
 *    el handshake WebRTC termine.
 *  - Después de `idleTimeoutMs` sin nuevos chunks, cierra la sesión sola.
 *  - El próximo `speak()` la vuelve a abrir (cuesta 2-5s de latencia).
 */
export function useHeyGen(opts: UseHeyGenOpts = {}) {
  const {
    avatarId = "Wayne_20240711",
    language = "es",
    enabled = true,
    idleTimeoutMs = 60_000,
  } = opts;
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const sessionReadyRef = useRef<boolean>(false);
  const pendingBuf = useRef<string>("");
  const flushTimer = useRef<number | null>(null);
  const idleTimer = useRef<number | null>(null);
  const startingRef = useRef<boolean>(false);

  const cancelIdleTimer = useCallback(() => {
    if (idleTimer.current) {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }, []);

  const teardown = useCallback(async () => {
    cancelIdleTimer();
    if (flushTimer.current) {
      window.clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    pendingBuf.current = "";
    sessionReadyRef.current = false;
    if (sessionRef.current) {
      try {
        await sessionRef.current.stop();
      } catch {
        // ignore
      }
      sessionRef.current = null;
    }
    setStatus("idle");
  }, [cancelIdleTimer]);

  const scheduleIdleClose = useCallback(() => {
    cancelIdleTimer();
    if (idleTimeoutMs <= 0) return;
    idleTimer.current = window.setTimeout(() => {
      void teardown();
    }, idleTimeoutMs);
  }, [cancelIdleTimer, teardown, idleTimeoutMs]);

  const flushBuffer = useCallback(() => {
    flushTimer.current = null;
    const text = pendingBuf.current.trim();
    pendingBuf.current = "";
    if (!text) return;
    if (!sessionRef.current || !sessionReadyRef.current) {
      // Sesión aún no ready — devolvemos el texto al buffer y reprogramamos.
      pendingBuf.current = text + " " + pendingBuf.current;
      flushTimer.current = window.setTimeout(flushBuffer, 250);
      return;
    }
    try {
      sessionRef.current.repeat(text);
    } catch (e) {
      console.warn("[LiveAvatar] repeat failed", e);
    }
  }, []);

  const ensureSessionStarted = useCallback(async (): Promise<boolean> => {
    if (sessionRef.current && sessionReadyRef.current) return true;
    if (startingRef.current) return false; // ya hay un start en curso
    startingRef.current = true;
    try {
      setStatus("connecting");
      const { token } = await window.iTutor.heygen.mintToken({
        avatarId,
        language,
      });
      const session = new LiveAvatarSession(token, { voiceChat: false });
      sessionRef.current = session;

      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        if (videoRef.current) {
          session.attach(videoRef.current);
          videoRef.current.play().catch(() => {});
        }
        sessionReadyRef.current = true;
        setStatus("ready");
        // Si quedó algo en el buffer mientras conectaba, drenalo.
        if (pendingBuf.current) {
          if (flushTimer.current) window.clearTimeout(flushTimer.current);
          flushTimer.current = window.setTimeout(flushBuffer, 50);
        }
        scheduleIdleClose();
      });
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        cancelIdleTimer();
        setStatus("speaking");
      });
      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        setStatus("ready");
        scheduleIdleClose();
      });
      session.on(SessionEvent.SESSION_DISCONNECTED, () => {
        sessionReadyRef.current = false;
        sessionRef.current = null;
        setStatus("idle");
      });

      await session.start();
      return true;
    } catch (e) {
      sessionRef.current = null;
      sessionReadyRef.current = false;
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
      setStatus("error");
      return false;
    } finally {
      startingRef.current = false;
    }
  }, [avatarId, language, flushBuffer, scheduleIdleClose, cancelIdleTimer]);

  /**
   * Buffereamos chunks pequeños del stream Claude por ~250ms o ~80 chars
   * (lo que pase primero). En el primer chunk, levantamos la sesión.
   */
  const speak = useCallback(
    (chunk: string) => {
      if (!enabled) return;
      pendingBuf.current += chunk;
      cancelIdleTimer(); // hay actividad, no cerremos
      if (!sessionRef.current && !startingRef.current) {
        void ensureSessionStarted();
      }
      if (pendingBuf.current.length >= 80) {
        if (flushTimer.current) window.clearTimeout(flushTimer.current);
        flushBuffer();
      } else if (!flushTimer.current) {
        flushTimer.current = window.setTimeout(flushBuffer, 250);
      }
    },
    [enabled, ensureSessionStarted, flushBuffer, cancelIdleTimer]
  );

  const interrupt = useCallback(() => {
    pendingBuf.current = "";
    if (flushTimer.current) {
      window.clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    try {
      sessionRef.current?.interrupt();
    } catch {
      // ignore
    }
  }, []);

  // Graceful stop signal del main process al cerrar Electron.
  useEffect(() => {
    return window.iTutor.heygen.onGracefulStop(() => {
      void teardown();
    });
  }, [teardown]);

  // Stop global desde el botón "Parar profe" o Esc.
  useEffect(() => {
    const onAbort = () => interrupt();
    window.addEventListener("itutor:abort", onAbort);
    return () => window.removeEventListener("itutor:abort", onAbort);
  }, [interrupt]);

  // Si el componente se desmonta, cerramos también.
  useEffect(() => {
    return () => {
      void teardown();
    };
  }, [teardown]);

  return {
    videoRef,
    status,
    errorMsg,
    speak,
    interrupt,
    startManually: ensureSessionStarted,
    stopManually: teardown,
  };
}
