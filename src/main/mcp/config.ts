import { join } from "node:path";
import { app } from "electron";
import { fileURLToPath } from "node:url";

/**
 * Resuelve la ruta del MCP server `computer-use` empaquetado.
 * En dev electron-vite lo bundlea a `out/main/mcp/computer-use/server.js`.
 * En prod queda en `resources/app.asar.unpacked/out/main/mcp/computer-use/server.js`.
 */
function resolveComputerUseServer(): string {
  const isDev = !app.isPackaged;
  if (isDev) {
    return join(app.getAppPath(), "out/main/mcp/computer-use/server.js");
  }
  return join(
    process.resourcesPath,
    "app.asar.unpacked/out/main/mcp/computer-use/server.js"
  );
}

export interface McpServerSpec {
  type: "stdio";
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export function buildMcpServers(): Record<string, McpServerSpec> {
  return {
    "computer-use": {
      type: "stdio",
      command: process.execPath,
      args: [resolveComputerUseServer()],
      env: {
        ...process.env,
        // Forzar a Electron a correr el script Node-only (no Chromium):
        ELECTRON_RUN_AS_NODE: "1",
      } as Record<string, string>,
    },
    playwright: {
      type: "stdio",
      command: "npx",
      args: ["-y", "@playwright/mcp@latest"],
    },
  };
}
