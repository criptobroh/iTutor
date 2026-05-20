import { useEffect, useRef } from "react";
import { useChat, applyStreamEvent } from "@/store/chat";
import type { StreamEvent } from "@shared/types";

interface UseAgentOpts {
  onAssistantText?: (chunk: string) => void;
}

export function useAgent(opts: UseAgentOpts = {}) {
  const onTextRef = useRef(opts.onAssistantText);
  onTextRef.current = opts.onAssistantText;

  useEffect(() => {
    return window.iTutor.agent.onStream((e: StreamEvent) => {
      applyStreamEvent(e);
      if (e.kind === "assistant_text" && onTextRef.current) {
        onTextRef.current(e.text);
      }
    });
  }, []);

  return {
    send: async (text: string) => {
      const chat = useChat.getState();
      chat.push("user", text);
      // Hueco para el próximo mensaje del assistant
      chat.push("assistant", "");
      chat.setBusy(true);
      await window.iTutor.agent.start({ prompt: text });
    },
    abort: () => {
      // Dispara un evento global para que el avatar también se calle.
      window.dispatchEvent(new CustomEvent("itutor:abort"));
      useChat.getState().setBusy(false);
      return window.iTutor.agent.abort();
    },
  };
}
