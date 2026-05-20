#!/usr/bin/env node
/**
 * MCP stdio server expuesto a Claude Agent SDK como `computer-use`.
 * Lo levanta el Agent SDK como subproceso (command: node, args: [server.js]).
 *
 * Tools:
 *   - take_screenshot
 *   - mouse_move, mouse_click, mouse_drag, mouse_scroll
 *   - keyboard_type, keyboard_hotkey
 *   - wait, get_screen_size
 *
 * Safety: cada tool de mutación llama assertNotKilled() antes de ejecutar.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  takeScreenshot,
  moveMouse,
  clickMouse,
  dragMouse,
  scrollMouse,
  typeText,
  pressHotkey,
  wait,
  getScreenSize,
} from "./tools.js";

const server = new Server(
  { name: "itutor-computer-use", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

const tools = [
  {
    name: "take_screenshot",
    description:
      "Toma un screenshot de la pantalla activa y lo devuelve como imagen PNG. Usalo SIEMPRE antes de cualquier secuencia de clicks para ver el estado actual.",
    inputSchema: {
      type: "object",
      properties: {
        display: {
          type: "number",
          description: "Índice del monitor (0 = principal). Default 0.",
        },
      },
    },
  },
  {
    name: "mouse_move",
    description: "Mueve el cursor a coordenadas absolutas (x, y) en píxeles.",
    inputSchema: {
      type: "object",
      properties: {
        x: { type: "number" },
        y: { type: "number" },
        duration_ms: {
          type: "number",
          description: "Duración del movimiento. Default ~300ms.",
        },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "mouse_click",
    description: "Click en la posición actual del cursor.",
    inputSchema: {
      type: "object",
      properties: {
        button: { type: "string", enum: ["left", "right", "middle"] },
        double: { type: "boolean" },
      },
    },
  },
  {
    name: "mouse_drag",
    description: "Drag desde (fromX, fromY) hasta (toX, toY).",
    inputSchema: {
      type: "object",
      properties: {
        from_x: { type: "number" },
        from_y: { type: "number" },
        to_x: { type: "number" },
        to_y: { type: "number" },
      },
      required: ["from_x", "from_y", "to_x", "to_y"],
    },
  },
  {
    name: "mouse_scroll",
    description: "Scrollea dx pasos horizontales y dy pasos verticales.",
    inputSchema: {
      type: "object",
      properties: {
        dx: { type: "number" },
        dy: { type: "number" },
      },
    },
  },
  {
    name: "keyboard_type",
    description: "Tipea texto literal en la app que tiene el foco.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string" },
        delay_ms: { type: "number" },
      },
      required: ["text"],
    },
  },
  {
    name: "keyboard_hotkey",
    description:
      'Apreta combinación de teclas. Ej: ["cmd","c"], ["ctrl","shift","t"], ["enter"].',
    inputSchema: {
      type: "object",
      properties: {
        keys: { type: "array", items: { type: "string" } },
      },
      required: ["keys"],
    },
  },
  {
    name: "wait",
    description: "Espera N milisegundos antes de la próxima acción.",
    inputSchema: {
      type: "object",
      properties: { ms: { type: "number" } },
      required: ["ms"],
    },
  },
  {
    name: "get_screen_size",
    description: "Devuelve el tamaño de la pantalla principal en píxeles.",
    inputSchema: { type: "object", properties: {} },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

const Args = {
  screenshot: z.object({ display: z.number().optional() }),
  move: z.object({
    x: z.number(),
    y: z.number(),
    duration_ms: z.number().optional(),
  }),
  click: z.object({
    button: z.enum(["left", "right", "middle"]).optional(),
    double: z.boolean().optional(),
  }),
  drag: z.object({
    from_x: z.number(),
    from_y: z.number(),
    to_x: z.number(),
    to_y: z.number(),
  }),
  scroll: z.object({ dx: z.number().optional(), dy: z.number().optional() }),
  type: z.object({ text: z.string(), delay_ms: z.number().optional() }),
  hotkey: z.object({ keys: z.array(z.string()) }),
  wait: z.object({ ms: z.number() }),
};

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: rawArgs } = req.params;
  try {
    switch (name) {
      case "take_screenshot": {
        const args = Args.screenshot.parse(rawArgs ?? {});
        const shot = await takeScreenshot(args.display);
        const scaleX = shot.fullWidth / shot.width;
        const scaleY = shot.fullHeight / shot.height;
        return {
          content: [
            {
              type: "image",
              data: shot.base64,
              mimeType: shot.mime,
            },
            {
              type: "text",
              text:
                `Screenshot ${shot.width}x${shot.height}px (pantalla real ` +
                `${shot.fullWidth}x${shot.fullHeight}px). ` +
                `IMPORTANTE para clickear: multiplicá las coordenadas que veas ` +
                `en esta imagen por (${scaleX.toFixed(2)}, ${scaleY.toFixed(2)}) ` +
                `antes de pasarlas a mouse_move/mouse_click.`,
            },
          ],
        };
      }
      case "mouse_move": {
        const args = Args.move.parse(rawArgs);
        await moveMouse(args.x, args.y, args.duration_ms);
        return ok(`cursor → (${args.x}, ${args.y})`);
      }
      case "mouse_click": {
        const args = Args.click.parse(rawArgs ?? {});
        await clickMouse(args.button ?? "left", args.double ?? false);
        return ok(`${args.double ? "double-click" : "click"} ${args.button ?? "left"}`);
      }
      case "mouse_drag": {
        const args = Args.drag.parse(rawArgs);
        await dragMouse(args.from_x, args.from_y, args.to_x, args.to_y);
        return ok(`drag (${args.from_x},${args.from_y})→(${args.to_x},${args.to_y})`);
      }
      case "mouse_scroll": {
        const args = Args.scroll.parse(rawArgs ?? {});
        await scrollMouse(args.dx ?? 0, args.dy ?? 0);
        return ok(`scroll dx=${args.dx ?? 0} dy=${args.dy ?? 0}`);
      }
      case "keyboard_type": {
        const args = Args.type.parse(rawArgs);
        await typeText(args.text, args.delay_ms);
        return ok(`tipeado: ${JSON.stringify(args.text.slice(0, 40))}…`);
      }
      case "keyboard_hotkey": {
        const args = Args.hotkey.parse(rawArgs);
        await pressHotkey(args.keys);
        return ok(`hotkey: ${args.keys.join("+")}`);
      }
      case "wait": {
        const args = Args.wait.parse(rawArgs);
        await wait(args.ms);
        return ok(`esperé ${args.ms}ms`);
      }
      case "get_screen_size": {
        const size = await getScreenSize();
        return ok(`${size.width}×${size.height}`);
      }
      default:
        return err(`Tool desconocido: ${name}`);
    }
  } catch (e: any) {
    return err(e?.message ?? String(e));
  }
});

function ok(text: string) {
  return { content: [{ type: "text", text }] };
}
function err(text: string) {
  return {
    content: [{ type: "text", text: `ERROR: ${text}` }],
    isError: true,
  };
}

const transport = new StdioServerTransport();
await server.connect(transport);
