/**
 * Declaración del global `window.iTutor` para el renderer.
 *
 * La implementación real vive en `src/preload/index.ts`. Esta declaración solo
 * existe para que el TypeScript del renderer (que no incluye preload en su
 * tsconfig) pueda autocompletar y validar tipos.
 */

import type {
  AgentRunRequest,
  AppSettings,
  HeygenSessionToken,
  StreamEvent,
  VoiceTranscribeRequest,
  VoiceTranscribeResponse,
} from "@shared/types";

interface ITutorApi {
  agent: {
    start(req: AgentRunRequest): Promise<void>;
    abort(): Promise<void>;
    onStream(cb: (e: StreamEvent) => void): () => void;
  };
  voice: {
    transcribe(req: VoiceTranscribeRequest): Promise<VoiceTranscribeResponse>;
  };
  heygen: {
    mintToken(opts: {
      avatarId: string;
      language?: string;
      voiceId?: string;
    }): Promise<HeygenSessionToken>;
    onGracefulStop(cb: () => void): () => void;
  };
  settings: {
    get(): Promise<AppSettings>;
    set(patch: Partial<AppSettings>): Promise<AppSettings>;
  };
  window: {
    hide(): Promise<void>;
    pin(pinned: boolean): Promise<void>;
  };
  killSwitch: {
    toggle(): Promise<boolean>;
    state(): Promise<boolean>;
    onChange(cb: (on: boolean) => void): () => void;
  };
}

declare global {
  interface Window {
    iTutor: ITutorApi;
  }
}

export {};
