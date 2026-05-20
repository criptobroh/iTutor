import { BrowserWindow, screen, app } from "electron";
import { join } from "node:path";
import { is } from "@electron-toolkit/utils";

const WIN_WIDTH = 520;
const WIN_HEIGHT = 720;

export function createMainWindow(): BrowserWindow {
  const { workArea } = screen.getPrimaryDisplay();
  const x = Math.round(workArea.x + (workArea.width - WIN_WIDTH) / 2);
  const y = Math.round(workArea.y + (workArea.height - WIN_HEIGHT) / 4);

  const win = new BrowserWindow({
    width: WIN_WIDTH,
    height: WIN_HEIGHT,
    x,
    y,
    show: false,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    hasShadow: true,
    titleBarStyle: "hidden",
    vibrancy: process.platform === "darwin" ? "under-window" : undefined,
    visualEffectState: "active",
    backgroundMaterial: process.platform === "win32" ? "acrylic" : undefined,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
  });

  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.once("ready-to-show", () => win.show());

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  win.on("blur", () => {
    // Mantener flotando, no autohide. Pablo puede pin/unpin desde la UI.
  });

  return win;
}

export function toggleWindow(win: BrowserWindow | null): void {
  if (!win || win.isDestroyed()) return;
  if (win.isVisible() && win.isFocused()) {
    win.hide();
  } else {
    win.show();
    win.focus();
  }
}
