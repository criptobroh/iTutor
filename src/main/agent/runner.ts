import { query } from "@anthropic-ai/claude-agent-sdk";
import { TUTOR_SYSTEM_PROMPT } from "./prompt.js";
import { buildMcpServers } from "../mcp/config.js";
import { getSettings } from "../store.js";
import type { AgentRunRequest, StreamEvent } from "../../shared/types.js";

let currentAbort: AbortController | null = null;
let currentSessionId: string | undefined = undefined;

export async function runAgent(
  req: AgentRunRequest,
  onEvent: (e: StreamEvent) => void
): Promise<void> {
  // Cancelá cualquier run anterior
  abortAgent();
  currentAbort = new AbortController();
  const startedAt = Date.now();

  const settings = getSettings();
  const model = req.model || settings.model;
  const mcpServers = buildMcpServers();

  if (!process.env.ANTHROPIC_API_KEY) {
    onEvent({
      kind: "error",
      message:
        "Falta ANTHROPIC_API_KEY en .env — copiá .env.example a .env y pegá tu clave.",
    });
    return;
  }

  try {
    const iterable = query({
      prompt: req.prompt,
      options: {
        model,
        // Prompt caching del system prompt + tool definitions: las primeras
        // requests pagan full, las siguientes pagan ~10% por el system y tools
        // (descuento de Anthropic prompt cache).
        systemPrompt: {
          type: "preset",
          preset: "claude_code",
          append: TUTOR_SYSTEM_PROMPT,
        },
        mcpServers: mcpServers as unknown as Record<string, never>,
        // 🔒 HARDENING: solo tools del MCP computer-use y Playwright.
        // Sacamos Read/Glob/Grep/WebSearch/WebFetch/Bash/Write/Edit del
        // allowlist — el tutor NO necesita leer/escribir archivos ni navegar
        // por su cuenta. Cualquier prompt injection que intente "ejecutá X
        // archivo" falla porque el tool no está habilitado.
        allowedTools: [
          // MCP computer-use (local, kill-switched)
          "mcp__computer-use__take_screenshot",
          "mcp__computer-use__mouse_move",
          "mcp__computer-use__mouse_click",
          "mcp__computer-use__mouse_drag",
          "mcp__computer-use__mouse_scroll",
          "mcp__computer-use__keyboard_type",
          "mcp__computer-use__keyboard_hotkey",
          "mcp__computer-use__wait",
          "mcp__computer-use__get_screen_size",
          // Playwright MCP (browser navegando explícitamente, no acceso fs)
          "mcp__playwright__browser_navigate",
          "mcp__playwright__browser_click",
          "mcp__playwright__browser_type",
          "mcp__playwright__browser_snapshot",
          "mcp__playwright__browser_screenshot",
          "mcp__playwright__browser_close",
        ],
        // bypassPermissions + allowlist restrictivo arriba = el agent solo
        // puede ejecutar tools de mouse/teclado/screenshot/browser. No hay
        // shell, no fs, no exfiltración via WebFetch.
        permissionMode: "bypassPermissions",
        ...(req.resumeSessionId ? { resume: req.resumeSessionId } : {}),
      },
    });

    for await (const msg of iterable) {
      if (currentAbort?.signal.aborted) break;
      relay(msg, onEvent);
    }

    onEvent({ kind: "done", durationMs: Date.now() - startedAt });
  } catch (e: any) {
    if (currentAbort?.signal.aborted) {
      onEvent({ kind: "error", message: "Cancelado por el usuario." });
    } else {
      onEvent({ kind: "error", message: e?.message ?? String(e) });
    }
  } finally {
    currentAbort = null;
  }
}

export function abortAgent(): void {
  if (currentAbort) {
    currentAbort.abort();
    currentAbort = null;
  }
}

function relay(msg: any, onEvent: (e: StreamEvent) => void): void {
  // Agent SDK message shapes (best-effort defensive parsing).
  if (msg.type === "system" && msg.subtype === "init") {
    currentSessionId = msg.session_id;
    onEvent({ kind: "session_start", sessionId: msg.session_id });
    return;
  }

  if (msg.type === "assistant" && msg.message?.content) {
    const content = msg.message.content;
    const messageId = msg.message.id ?? cryptoRandom();
    for (const block of content) {
      if (block.type === "text" && typeof block.text === "string") {
        onEvent({ kind: "assistant_text", text: block.text, messageId });
      } else if (block.type === "tool_use") {
        onEvent({
          kind: "tool_use",
          toolUseId: block.id,
          name: block.name,
          input: block.input,
          mcpServer: detectMcpServer(block.name),
        });
      }
    }
    onEvent({ kind: "assistant_done", messageId });
    return;
  }

  if (msg.type === "user" && msg.message?.content) {
    for (const block of msg.message.content) {
      if (block.type === "tool_result") {
        const text =
          Array.isArray(block.content)
            ? block.content
                .filter((c: any) => c.type === "text")
                .map((c: any) => c.text)
                .join("\n")
            : typeof block.content === "string"
              ? block.content
              : "";
        onEvent({
          kind: "tool_result",
          toolUseId: block.tool_use_id,
          ok: !block.is_error,
          summary: text.slice(0, 240),
        });
      }
    }
  }
}

function detectMcpServer(toolName: string): string | undefined {
  if (toolName.startsWith("mcp__")) {
    return toolName.split("__")[1];
  }
  return undefined;
}

function cryptoRandom(): string {
  return Math.random().toString(36).slice(2, 12);
}
