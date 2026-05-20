import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "../shared/ipc-channels.js";
import type {
  AgentRunRequest,
  AppSettings,
  StreamEvent,
  VoiceTranscribeRequest,
  VoiceTranscribeResponse,
  HeygenSessionToken,
} from "../shared/types.js";

const api = {
  agent: {
    start(req: AgentRunRequest): Promise<void> {
      return ipcRenderer.invoke(IPC.AGENT_START, req);
    },
    abort(): Promise<void> {
      return ipcRenderer.invoke(IPC.AGENT_ABORT);
    },
    onStream(cb: (e: StreamEvent) => void): () => void {
      const listener = (_e: unknown, payload: StreamEvent) => cb(payload);
      ipcRenderer.on(IPC.AGENT_STREAM, listener);
      return () => ipcRenderer.off(IPC.AGENT_STREAM, listener);
    },
  },
  voice: {
    transcribe(req: VoiceTranscribeRequest): Promise<VoiceTranscribeResponse> {
      return ipcRenderer.invoke(IPC.VOICE_TRANSCRIBE, req);
    },
  },
  heygen: {
    mintToken(opts: {
      avatarId: string;
      language?: string;
      voiceId?: string;
    }): Promise<HeygenSessionToken> {
      return ipcRenderer.invoke(IPC.HEYGEN_TOKEN, opts);
    },
    onGracefulStop(cb: () => void): () => void {
      const listener = () => cb();
      ipcRenderer.on(IPC.AVATAR_GRACEFUL_STOP, listener);
      return () => ipcRenderer.off(IPC.AVATAR_GRACEFUL_STOP, listener);
    },
  },
  settings: {
    get(): Promise<AppSettings> {
      return ipcRenderer.invoke(IPC.SETTINGS_GET);
    },
    set(patch: Partial<AppSettings>): Promise<AppSettings> {
      return ipcRenderer.invoke(IPC.SETTINGS_SET, patch);
    },
  },
  window: {
    hide(): Promise<void> {
      return ipcRenderer.invoke(IPC.WINDOW_HIDE);
    },
    pin(pinned: boolean): Promise<void> {
      return ipcRenderer.invoke(IPC.WINDOW_PIN, pinned);
    },
  },
  killSwitch: {
    toggle(): Promise<boolean> {
      return ipcRenderer.invoke(IPC.KILL_SWITCH_TOGGLE);
    },
    state(): Promise<boolean> {
      return ipcRenderer.invoke(IPC.KILL_SWITCH_STATE);
    },
    onChange(cb: (on: boolean) => void): () => void {
      const listener = (_e: unknown, on: boolean) => cb(on);
      ipcRenderer.on(IPC.KILL_SWITCH_STATE, listener);
      return () => ipcRenderer.off(IPC.KILL_SWITCH_STATE, listener);
    },
  },
};

contextBridge.exposeInMainWorld("iTutor", api);

export type ITutorApi = typeof api;
declare global {
  interface Window {
    iTutor: ITutorApi;
  }
}
