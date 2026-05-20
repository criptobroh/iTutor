import { create } from "zustand";
import type { StreamEvent } from "@shared/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  toolCalls: ToolCall[];
  streaming: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  mcpServer?: string;
  status: "running" | "ok" | "error";
  summary?: string;
}

interface ChatState {
  messages: ChatMessage[];
  sessionId?: string;
  busy: boolean;
  push: (role: "user" | "assistant", text: string) => string;
  appendAssistantText: (id: string, chunk: string) => void;
  setMessageStreaming: (id: string, streaming: boolean) => void;
  addToolCall: (messageId: string, call: ToolCall) => void;
  updateToolCall: (
    messageId: string,
    callId: string,
    patch: Partial<ToolCall>
  ) => void;
  setBusy: (b: boolean) => void;
  setSession: (id: string) => void;
  reset: () => void;
}

export const useChat = create<ChatState>((set) => ({
  messages: [],
  busy: false,
  push: (role, text) => {
    const id = `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({
      messages: [
        ...s.messages,
        { id, role, text, toolCalls: [], streaming: role === "assistant" },
      ],
    }));
    return id;
  },
  appendAssistantText: (id, chunk) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, text: m.text + chunk } : m
      ),
    })),
  setMessageStreaming: (id, streaming) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, streaming } : m
      ),
    })),
  addToolCall: (messageId, call) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === messageId ? { ...m, toolCalls: [...m.toolCalls, call] } : m
      ),
    })),
  updateToolCall: (messageId, callId, patch) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              toolCalls: m.toolCalls.map((c) =>
                c.id === callId ? { ...c, ...patch } : c
              ),
            }
          : m
      ),
    })),
  setBusy: (b) => set({ busy: b }),
  setSession: (id) => set({ sessionId: id }),
  reset: () => set({ messages: [], sessionId: undefined, busy: false }),
}));

export function applyStreamEvent(e: StreamEvent): void {
  const s = useChat.getState();
  switch (e.kind) {
    case "session_start":
      s.setSession(e.sessionId);
      break;
    case "assistant_text": {
      const last = [...s.messages].reverse().find((m) => m.role === "assistant" && m.streaming);
      if (last) {
        s.appendAssistantText(last.id, e.text);
      } else {
        const id = s.push("assistant", e.text);
        // mark not streaming until next chunk arrives — handled by SDK done
        void id;
      }
      break;
    }
    case "assistant_done": {
      const last = [...s.messages].reverse().find((m) => m.role === "assistant" && m.streaming);
      if (last) s.setMessageStreaming(last.id, false);
      break;
    }
    case "tool_use": {
      const last = [...s.messages].reverse().find((m) => m.role === "assistant");
      const target = last ?? { id: s.push("assistant", "") } as any;
      s.addToolCall(target.id, {
        id: e.toolUseId,
        name: e.name,
        mcpServer: e.mcpServer,
        status: "running",
      });
      break;
    }
    case "tool_result": {
      for (const m of s.messages) {
        if (m.toolCalls.some((c) => c.id === e.toolUseId)) {
          s.updateToolCall(m.id, e.toolUseId, {
            status: e.ok ? "ok" : "error",
            summary: e.summary,
          });
          break;
        }
      }
      break;
    }
    case "done":
      s.setBusy(false);
      break;
    case "error":
      s.push("assistant", `⚠️ ${e.message}`);
      s.setBusy(false);
      break;
  }
}
