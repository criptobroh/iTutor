import { app, BrowserWindow, globalShortcut, ipcMain } from "electron";
import { config as loadEnv } from "dotenv";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Cargar .env ANTES de cualquier otro import (para que store.ts y demás vean
// las env vars al evaluar sus módulos). Probamos varios paths porque el cwd
// puede ser distinto en dev (electron-vite) vs packaged.
function loadEnvFromKnownPaths(): void {
  const candidates = [
    process.env.ITUTOR_ENV_PATH,
    join(app.getAppPath(), ".env"),
    join(process.cwd(), ".env"),
    // Packaged: app.asar.unpacked/.env
    join(process.resourcesPath ?? "", "app.asar.unpacked/.env"),
  ].filter((p): p is string => !!p);
  for (const p of candidates) {
    if (existsSync(p)) {
      const result = loadEnv({ path: p });
      if (!result.error) {
        console.log(`[iTutor] .env cargado desde ${p}`);
        return;
      }
    }
  }
  console.warn(
    "[iTutor] No encontré .env. Probé:\n  - " + candidates.join("\n  - ")
  );
}
loadEnvFromKnownPaths();

// 🛰️ Network compatibility flags (set ANTES de app.whenReady).
// Estos dos flags destraban WebRTC cuando hay iCloud Private Relay, Cloudflare
// WARP, Tailscale, NordVPN o similares activas:
//
// 1. webrtc-ip-handling-policy=default_public_interface_only
//    Fuerza al ICE gatherer a usar SOLO la interfaz default pública (en0/Wi-Fi),
//    ignorando utun*/tap*. Sin esto, Chromium intenta bindear STUN a la IP de
//    la VPN (198.19.x.x para Private Relay) y los binding requests timeoutean.
//
// 2. disable-features=AsyncDns
//    Apaga el resolver DNS async interno de Chromium y vuelve al getaddrinfo
//    del OS. El async resolver hace DoH encriptado que falla detrás de Private
//    Relay porque las queries van a relay.icloud.com en lugar de tu DNS local.
//
// Ninguno reduce seguridad — solo cambian QUÉ stack de red se usa. El TLS y
// el cifrado de WebRTC siguen igual.
app.commandLine.appendSwitch(
  "webrtc-ip-handling-policy",
  "default_public_interface_only"
);
// Desactivar el resolver built-in de Chromium ANTES de app.whenReady (la API
// app.configureHostResolver() solo se puede llamar dentro del ready handler).
app.commandLine.appendSwitch("disable-features", "AsyncDns,DnsOverHttps");
app.commandLine.appendSwitch("disable-features", "EnableNetworkServiceInProcess");
// Algunos forks de Chromium siguen el flag legacy:
app.commandLine.appendSwitch("disable-async-dns");

import { createMainWindow, toggleWindow } from "./window.js";
import { IPC } from "../shared/ipc-channels.js";
import { runAgent, abortAgent } from "./agent/runner.js";
import { transcribe } from "./voice/whisper.js";
import { getSettings, setSettings } from "./store.js";
import { mintLiveAvatarToken } from "./liveavatar.js";
import {
  isKillSwitchOn,
  toggleKillSwitch,
  installEscEscEscWatcher,
} from "./mcp/computer-use/safety.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function registerIpc(): void {
  ipcMain.handle(IPC.AGENT_START, async (event, request) => {
    return runAgent(request, (e) => {
      event.sender.send(IPC.AGENT_STREAM, e);
    });
  });

  ipcMain.handle(IPC.AGENT_ABORT, () => abortAgent());

  ipcMain.handle(IPC.VOICE_TRANSCRIBE, async (_e, req) => transcribe(req));

  ipcMain.handle(IPC.HEYGEN_TOKEN, async (_e, opts: { avatarId: string; language?: string; voiceId?: string }) =>
    mintLiveAvatarToken(opts)
  );

  ipcMain.handle(IPC.SETTINGS_GET, () => getSettings());
  ipcMain.handle(IPC.SETTINGS_SET, (_e, patch) => setSettings(patch));

  ipcMain.handle(IPC.WINDOW_TOGGLE, () => toggleWindow(mainWindow));
  ipcMain.handle(IPC.WINDOW_HIDE, () => mainWindow?.hide());
  ipcMain.handle(IPC.WINDOW_PIN, (_e, pinned: boolean) =>
    mainWindow?.setAlwaysOnTop(pinned, "screen-saver")
  );

  ipcMain.handle(IPC.KILL_SWITCH_TOGGLE, () => {
    const next = toggleKillSwitch();
    mainWindow?.webContents.send(IPC.KILL_SWITCH_STATE, next);
    return next;
  });
  ipcMain.handle(IPC.KILL_SWITCH_STATE, () => isKillSwitchOn());
}

function registerHotkey(): void {
  const settings = getSettings();
  const accelerator = settings.hotkey || "CommandOrControl+Space";
  const ok = globalShortcut.register(accelerator, () => {
    toggleWindow(mainWindow);
  });
  if (!ok) {
    console.warn(`[iTutor] No pude registrar el hotkey ${accelerator}`);
  }
}

app.whenReady().then(() => {
  // Force-disable Chromium built-in DNS resolver + DoH. Necesario para que
  // WebRTC funcione detrás de iCloud Private Relay / WARP / Tailscale que
  // interceptan el DoH del browser y le bochan la resolución de los nodos
  // LiveKit (host.livekit.cloud) al avatar.
  app.configureHostResolver({
    enableBuiltInResolver: false,
    secureDnsMode: "off",
  });
  mainWindow = createMainWindow();
  registerIpc();
  registerHotkey();
  installEscEscEscWatcher(() => {
    mainWindow?.webContents.send(IPC.KILL_SWITCH_STATE, true);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow();
  } else {
    mainWindow.show();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// Graceful shutdown del avatar: avisamos al renderer que cierre la sesión
// LiveAvatar limpio antes de cerrar la ventana. Sin esto, cada restart deja
// una sesión zombi que cuenta contra el concurrency limit de la cuenta hasta
// que LiveAvatar la autopurgue (~3-5 min).
let isQuitting = false;
app.on("before-quit", (event) => {
  if (isQuitting) return;
  if (mainWindow && !mainWindow.isDestroyed()) {
    event.preventDefault();
    isQuitting = true;
    mainWindow.webContents.send("avatar:graceful-stop");
    // Damos 500ms para que el renderer mande el SESSION_STOP a LiveAvatar.
    setTimeout(() => app.exit(0), 500);
  }
});

// Avoid the warning sea
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

export { __dirname };
