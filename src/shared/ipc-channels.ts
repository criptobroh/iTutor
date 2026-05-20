/**
 * Nombres de canales IPC. Centralizados para que main, preload y renderer
 * compartan la misma fuente de verdad.
 */

export const IPC = {
  // Agent lifecycle
  AGENT_START: "agent:start",
  AGENT_ABORT: "agent:abort",
  AGENT_STREAM: "agent:stream",

  // Voice (push-to-talk)
  VOICE_TRANSCRIBE: "voice:transcribe",

  // HeyGen / LiveAvatar
  HEYGEN_TOKEN: "heygen:token",
  AVATAR_GRACEFUL_STOP: "avatar:graceful-stop",

  // Settings
  SETTINGS_GET: "settings:get",
  SETTINGS_SET: "settings:set",

  // Window
  WINDOW_TOGGLE: "window:toggle",
  WINDOW_HIDE: "window:hide",
  WINDOW_PIN: "window:pin",

  // Safety
  KILL_SWITCH_TOGGLE: "kill-switch:toggle",
  KILL_SWITCH_STATE: "kill-switch:state",
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
