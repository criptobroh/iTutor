import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveAvatarSession,
  SessionEvent,
  AgentEventsEnum,
} from "@heygen/liveavatar-web-sdk";

type Status = "idle" | "connecting" | "ready" | "speaking" | "error";

interface UseHeyGenOpts {
  avatarId?: string;
  language?: string;
  enabled?: boolean;
}

export function useHeyGen(opts: UseHeyGenOpts = {}) {
  const { avatarId = "Wayne_20240711", language = "es", enabled = true } = opts;
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const pendingBuf = useRef<string>("");
  const flushTimer = useRef<number | null>(null);

  const teardown = useCallback(async () => {
    if (flushTimer.current) {
      window.clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    if (sessionRef.current) {
      try {
        await sessionRef.current.stop();
      } catch {
        // ignore
      }
      sessionRef.current = null;
    }
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        setStatus("connecting");
        const { token } = await window.iTutor.heygen.mintToken({
          avatarId,
          language,
        });
        if (cancelled) return;
        const session = new LiveAvatarSession(token, { voiceChat: false });
        sessionRef.current = session;

        session.on(SessionEvent.SESSION_STREAM_READY, () => {
          if (videoRef.current) {
            session.attach(videoRef.current);
            videoRef.current.play().catch(() => {});
          }
          setStatus("ready");
        });
        session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () =>
          setStatus("speaking")
        );
        session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () =>
          setStatus("ready")
        );
        session.on(SessionEvent.SESSION_DISCONNECTED, () => setStatus("idle"));

        await session.start();
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setErrorMsg(msg);
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
      void teardown();
    };
  }, [enabled, avatarId, language, teardown]);

  /**
   * Buffereamos chunks pequeños del stream Claude por ~250ms o ~80 chars
   * (lo que pase primero) para evitar enviar miles de tasks chiquitas al
   * avatar y romper la cadencia natural del habla.
   */
  const speak = useCallback((chunk: string) => {
    pendingBuf.current += chunk;
    const flush = () => {
      const text = pendingBuf.current.trim();
      pendingBuf.current = "";
      flushTimer.current = null;
      if (!text || !sessionRef.current) return;
      try {
        sessionRef.current.repeat(text);
      } catch (e) {
        console.warn("[LiveAvatar] repeat failed", e);
      }
    };
    if (pendingBuf.current.length >= 80) {
      if (flushTimer.current) window.clearTimeout(flushTimer.current);
      flush();
    } else if (!flushTimer.current) {
      flushTimer.current = window.setTimeout(flush, 250);
    }
  }, []);

  const interrupt = useCallback(() => {
    pendingBuf.current = "";
    if (flushTimer.current) window.clearTimeout(flushTimer.current);
    flushTimer.current = null;
    try {
      sessionRef.current?.interrupt();
    } catch {
      // ignore
    }
  }, []);

  return { videoRef, status, errorMsg, speak, interrupt };
}
