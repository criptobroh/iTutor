import Store from "electron-store";
import type { AppSettings } from "../shared/types.js";

const defaults: AppSettings = {
  hotkey: process.env.ITUTOR_HOTKEY || "CommandOrControl+Space",
  alwaysOnTop: true,
  avatarEnabled: true,
  voiceInputEnabled: true,
  model: process.env.ITUTOR_MODEL || "claude-haiku-4-5-20251001",
  heygenAvatarId: process.env.LIVEAVATAR_AVATAR_ID || process.env.HEYGEN_AVATAR_ID || "55eec60c-d665-4972-a529-bbdcaf665ab8",
  heygenLanguage: process.env.LIVEAVATAR_LANGUAGE || process.env.HEYGEN_LANGUAGE || "es",
};

const store = new Store<AppSettings>({
  name: "itutor-settings",
  defaults,
});

// Force-apply env overrides on startup. Sin esto, la primera corrida sería
// la única que respeta .env y cambios posteriores quedarían enmascarados por
// el cache de disco de electron-store.
const ENV_OVERRIDES: Partial<AppSettings> = {
  hotkey: process.env.ITUTOR_HOTKEY || undefined,
  model: process.env.ITUTOR_MODEL || undefined,
  heygenAvatarId:
    process.env.LIVEAVATAR_AVATAR_ID || process.env.HEYGEN_AVATAR_ID || undefined,
  heygenLanguage:
    process.env.LIVEAVATAR_LANGUAGE || process.env.HEYGEN_LANGUAGE || undefined,
};
for (const [k, v] of Object.entries(ENV_OVERRIDES)) {
  if (v !== undefined) (store as any).set(k, v);
}

export function getSettings(): AppSettings {
  return store.store;
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  for (const [k, v] of Object.entries(patch)) {
    (store as any).set(k, v);
  }
  return store.store;
}
