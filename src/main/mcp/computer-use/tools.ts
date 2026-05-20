import {
  mouse,
  keyboard,
  Button,
  Key,
  Point,
  straightTo,
  screen as nutScreen,
} from "@nut-tree-fork/nut-js";
import screenshot from "screenshot-desktop";
import sharp from "sharp";
import { assertNotKilled } from "./safety.js";

const SCREENSHOT_MAX_WIDTH = Math.max(
  640,
  Number(process.env.ITUTOR_SCREENSHOT_MAX_WIDTH) || 1280
);

mouse.config.mouseSpeed = 1000;
keyboard.config.autoDelayMs = 12;

export interface ScreenshotResult {
  base64: string;
  mime: "image/png";
  /** Ancho de la imagen tal cual fue enviada (post-resize). */
  width: number;
  /** Alto idem. */
  height: number;
  /** Ancho real de la pantalla en píxeles físicos. */
  fullWidth: number;
  /** Alto real idem. */
  fullHeight: number;
}

export async function takeScreenshot(
  display?: number
): Promise<ScreenshotResult> {
  const raw = await screenshot({
    format: "png",
    ...(display !== undefined ? { screen: display as number } : {}),
  });

  // Resize a SCREENSHOT_MAX_WIDTH para abaratar tokens vision.
  // Claude cobra ≈ (w*h)/750 tokens por imagen. Bajar de 2560→1280 corta el
  // costo a ~25%. Mantenemos PNG (lossless) porque los píxeles importan para
  // detectar texto chico, botones, etc.
  const img = sharp(raw, { failOn: "none" });
  const meta = await img.metadata();
  const fullWidth = meta.width ?? (await nutScreen.width());
  const fullHeight = meta.height ?? (await nutScreen.height());

  const needsResize = fullWidth > SCREENSHOT_MAX_WIDTH;
  const out = needsResize
    ? await img
        .resize({ width: SCREENSHOT_MAX_WIDTH, withoutEnlargement: true })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer({ resolveWithObject: true })
    : await img.png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });

  return {
    base64: out.data.toString("base64"),
    mime: "image/png",
    width: out.info.width,
    height: out.info.height,
    fullWidth,
    fullHeight,
  };
}

export async function moveMouse(
  x: number,
  y: number,
  durationMs?: number
): Promise<void> {
  assertNotKilled("mouse_move");
  if (durationMs !== undefined) {
    mouse.config.mouseSpeed = Math.max(100, Math.round(1000 / (durationMs / 1000)));
  }
  await mouse.move(straightTo(new Point(x, y)));
}

export async function clickMouse(
  button: "left" | "right" | "middle" = "left",
  double = false
): Promise<void> {
  assertNotKilled("mouse_click");
  const btn =
    button === "left" ? Button.LEFT : button === "right" ? Button.RIGHT : Button.MIDDLE;
  if (double) {
    await mouse.doubleClick(btn);
  } else {
    await mouse.click(btn);
  }
}

export async function dragMouse(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): Promise<void> {
  assertNotKilled("mouse_drag");
  await mouse.move(straightTo(new Point(fromX, fromY)));
  await mouse.pressButton(Button.LEFT);
  await mouse.move(straightTo(new Point(toX, toY)));
  await mouse.releaseButton(Button.LEFT);
}

export async function scrollMouse(dx: number, dy: number): Promise<void> {
  assertNotKilled("mouse_scroll");
  if (dy > 0) await mouse.scrollDown(dy);
  else if (dy < 0) await mouse.scrollUp(Math.abs(dy));
  if (dx > 0) await mouse.scrollRight(dx);
  else if (dx < 0) await mouse.scrollLeft(Math.abs(dx));
}

export async function typeText(
  text: string,
  delayMs?: number
): Promise<void> {
  assertNotKilled("keyboard_type");
  if (delayMs !== undefined) keyboard.config.autoDelayMs = delayMs;
  await keyboard.type(text);
}

const KEY_MAP: Record<string, Key> = {
  cmd: Key.LeftSuper,
  command: Key.LeftSuper,
  super: Key.LeftSuper,
  win: Key.LeftSuper,
  meta: Key.LeftSuper,
  ctrl: Key.LeftControl,
  control: Key.LeftControl,
  alt: Key.LeftAlt,
  option: Key.LeftAlt,
  opt: Key.LeftAlt,
  shift: Key.LeftShift,
  enter: Key.Enter,
  return: Key.Return,
  esc: Key.Escape,
  escape: Key.Escape,
  tab: Key.Tab,
  space: Key.Space,
  backspace: Key.Backspace,
  delete: Key.Delete,
  up: Key.Up,
  down: Key.Down,
  left: Key.Left,
  right: Key.Right,
  home: Key.Home,
  end: Key.End,
  pageup: Key.PageUp,
  pagedown: Key.PageDown,
};

function resolveKey(token: string): Key {
  const lower = token.toLowerCase();
  if (KEY_MAP[lower]) return KEY_MAP[lower];
  if (/^[a-z0-9]$/.test(lower)) {
    return (Key as any)[lower.toUpperCase()] ?? (Key as any)[lower];
  }
  // F1..F12
  if (/^f([1-9]|1[0-2])$/i.test(lower)) {
    return (Key as any)[lower.toUpperCase()];
  }
  throw new Error(`Tecla desconocida: ${token}`);
}

export async function pressHotkey(keys: string[]): Promise<void> {
  assertNotKilled("keyboard_hotkey");
  if (keys.length === 0) return;
  const resolved = keys.map(resolveKey);
  await keyboard.pressKey(...resolved);
  await keyboard.releaseKey(...resolved);
}

export async function wait(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, Math.max(0, ms)));
}

export async function getScreenSize(): Promise<{
  width: number;
  height: number;
}> {
  return {
    width: await nutScreen.width(),
    height: await nutScreen.height(),
  };
}
