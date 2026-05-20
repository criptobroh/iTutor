import Store from "electron-store";
import type { AppSettings } from "../shared/types.js";

const defaults: AppSettings = {
  hotkey: process.env.ITUTOR_HOTKEY || "CommandOrControl+Space",
  alwaysOnTop: true,
  avatarEnabled: true,
  voiceInputEnabled: true,
  model: process.env.ITUTOR_MODEL || "claude-haiku-4-5-20251001",
  heygenAvatarId: process.env.LIVEAVATAR_AVATAR_ID || process.env.HEYGEN_AVATAR_ID || "Wayne_20240711",
  heygenLanguage: process.env.LIVEAVATAR_LANGUAGE || process.env.HEYGEN_LANGUAGE || "es",
};

const store = new Store<AppSettings>({
  name: "itutor-settings",
  defaults,
});

export function getSettings(): AppSettings {
  return store.store;
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  for (const [k, v] of Object.entries(patch)) {
    (store as any).set(k, v);
  }
  return store.store;
}
