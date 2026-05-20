import { globalShortcut } from "electron";

/**
 * Kill switch global. Cuando está ON, los tools de mutación (mouse, kb) tiran
 * error inmediato. Se mantiene en module scope para que el MCP server y la
 * UI compartan el flag a través de IPC sin necesidad de DB.
 *
 * Atajo Esc-Esc-Esc (3 escapes en <1.5s) prende el kill switch desde cualquier
 * lugar del OS.
 */

let killSwitchOn = false;
const subscribers = new Set<(on: boolean) => void>();

export function isKillSwitchOn(): boolean {
  return killSwitchOn;
}

export function setKillSwitch(on: boolean): boolean {
  killSwitchOn = on;
  for (const fn of subscribers) fn(on);
  return killSwitchOn;
}

export function toggleKillSwitch(): boolean {
  return setKillSwitch(!killSwitchOn);
}

export function subscribeKillSwitch(fn: (on: boolean) => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function assertNotKilled(actionName: string): void {
  if (killSwitchOn) {
    throw new Error(
      `iTutor kill switch activo — bloqueé la acción "${actionName}". ` +
        `Desactivá el switch desde la UI o esperá que el estudiante apruebe.`
    );
  }
}

/**
 * Registra un watcher global: si se aprieta Esc 3 veces en menos de 1.5s,
 * se prende el kill switch.
 */
export function installEscEscEscWatcher(onTrip: () => void): void {
  let hits: number[] = [];
  // Electron globalShortcut no captura Esc cuando otra app tiene foco,
  // así que esto sirve solo cuando iTutor está enfocado. Para captura global
  // en Mac/Win se requeriría iohook nativo — fuera de scope del MVP.
  const ok = globalShortcut.register("Escape", () => {
    const now = Date.now();
    hits = hits.filter((t) => now - t < 1500);
    hits.push(now);
    if (hits.length >= 3) {
      setKillSwitch(true);
      hits = [];
      onTrip();
    }
  });
  if (!ok) {
    console.warn("[iTutor] No pude registrar Esc-Esc-Esc kill switch");
  }
}
