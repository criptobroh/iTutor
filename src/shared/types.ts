/**
 * Tipos compartidos entre main, preload y renderer.
 */

export type AgentRole = "user" | "assistant" | "system" | "tool";

export type StreamEvent =
  | { kind: "session_start"; sessionId: string }
  | { kind: "assistant_text"; text: string; messageId: string }
  | { kind: "assistant_done"; messageId: string }
  | {
      kind: "tool_use";
      toolUseId: string;
      name: string;
      input: unknown;
      mcpServer?: string;
    }
  | {
      kind: "tool_result";
      toolUseId: string;
      ok: boolean;
      summary: string;
    }
  | { kind: "error"; message: string }
  | { kind: "done"; durationMs: number };

export interface AgentRunRequest {
  prompt: string;
  /** Si está presente, retoma una sesión previa (Agent SDK resume) */
  resumeSessionId?: string;
  /** Override del modelo para este turno */
  model?: string;
}

export interface VoiceTranscribeRequest {
  /** PCM 16-bit mono 16kHz como base64 */
  audioBase64: string;
  language?: string;
}

export interface VoiceTranscribeResponse {
  text: string;
  durationMs: number;
}

export interface AppSettings {
  hotkey: string;
  alwaysOnTop: boolean;
  avatarEnabled: boolean;
  voiceInputEnabled: boolean;
  model: string;
  heygenAvatarId: string;
  heygenLanguage: string;
}

export interface HeygenSessionToken {
  /** Token efímero generado en el main process para que el renderer abra WebRTC */
  token: string;
  /** Server URL del realtime */
  url?: string;
}
