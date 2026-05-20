import { app, BrowserWindow, globalShortcut, ipcMain } from "electron";
import { config as loadEnv } from "dotenv";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
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

loadEnv();

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

// Avoid the warning sea
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

export { __dirname };
