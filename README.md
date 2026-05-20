# iTutor (Electron MVP — archivado)

> ⚠️ **Este repo está archivado al commit `dd86d06` (tag `v0.1.0-electron-mvp`).**
>
> El MVP Electron local funcionó pero pivotamos a SaaS web multi-tenant con VMs efímeras
> + computer use remoto. La continuación vive en **[`criptobroh/iTutor-saas`](https://github.com/criptobroh/iTutor-saas)**.
>
> Si querés correr el MVP local original, hacé `git checkout v0.1.0-electron-mvp`.

---

> Un tutor AI de escritorio con **cara, voz y manos**. Vive como una ventana flotante
> hermosa (estilo Raycast), responde con un avatar de video real (HeyGen), y opera tu
> computadora por vos: mueve el cursor, tipea, toma screenshots, navega la web.

## Stack

- **Shell**: Electron 33 + Vite + React 19 + Tailwind 4 + shadcn-style primitives
- **Brain**: `@anthropic-ai/claude-agent-sdk` con `ANTHROPIC_API_KEY`
- **Avatar**: `@heygen/liveavatar-web-sdk` (LITE mode, 1 crédito/min)
- **Voice in**: `nodejs-whisper` (whisper.cpp local, modelo `base`)
- **Computer use**: MCP server custom + `@nut-tree-fork/nut-js` + `screenshot-desktop`
- **Browser automation**: `@playwright/mcp` (MCP oficial Microsoft)

## Cómo correrlo

```bash
# 1. Instalar deps
npm install

# 2. Copiar .env.example a .env y completar claves
cp .env.example .env
# Editá .env y pegá:
#   ANTHROPIC_API_KEY=sk-ant-...       (https://console.anthropic.com/settings/keys)
#   LIVEAVATAR_API_KEY=...              (https://app.liveavatar.com → Settings → API Keys)

# 3. Levantar en dev
npm run dev
```

La ventana flotante aparece en el centro de la pantalla. Tocá `Cmd+Space` (Mac) o
`Ctrl+Space` (Windows) para mostrar/ocultarla.

## Cómo usarlo

- **Tipear**: escribí en la barra de abajo, Enter para enviar.
- **Hablar**: mantené apretado el botón del micrófono (o `Espacio` cuando el textarea
  está vacío). Soltá y se transcribe + envía.
- **Pin/unpin**: el icono de chinche en la barra superior.
- **Kill switch**: el escudo en la barra superior. Si está rojo, el tutor no puede
  mover el cursor ni tipear. También: apretá `Esc` 3 veces seguidas para activarlo.

## Permisos macOS

La primera vez que el tutor intente mover el cursor, macOS va a bloquear y abrir
**System Settings → Privacy & Security**. Tenés que dar permisos a iTutor en:

- **Accessibility** (para mover mouse y tipear)
- **Screen Recording** (para tomar screenshots)
- **Microphone** (para que te escuche)

## Empaquetar para Windows

Desde Mac (cross-compile):

```bash
npm run build:win
# Genera dist/iTutor-Setup-0.1.0.exe
```

## Estructura

```
src/
├── main/             # Electron main process (Node)
│   ├── agent/        # Claude Agent SDK runner + system prompt
│   ├── mcp/          # MCP servers locales (computer-use + safety)
│   ├── voice/        # Whisper subprocess
│   ├── window.ts     # Frameless floating glass window
│   └── index.ts      # Entry
├── preload/          # Context bridge (window.iTutor.*)
├── renderer/         # React UI
│   └── src/
│       ├── components/  # FrostedShell, AvatarStage, ChatPane, Composer
│       ├── hooks/       # useAgent, useHeyGen, useVoiceInput
│       └── store/       # zustand (chat state)
└── shared/           # IPC channels + tipos compartidos
```

## Notas de seguridad

- **Kill switch**: cualquier acción de mouse/teclado pasa por `assertNotKilled()`.
  Cuando el switch está activo, los tools tiran error inmediato.
- **Permisos de Anthropic**: `permissionMode: bypassPermissions` está activo porque
  iTutor corre 100% local y el dueño es el mismo estudiante. Si vas a deployar esto
  multi-usuario, cambiá a `requireApproval` o similar.
- **HeyGen tokens** se mintean en el main process — la API key nunca llega al renderer.
- **OAuth Max**: NO se usa OAuth de Max porque viola los Consumer ToS de Anthropic en
  apps externas. Se usa API key. Cuando Anthropic libere créditos Agent SDK en planes
  Max (anunciado para 2026-06-15), migramos sin tocar arquitectura.

## Costos esperados

| Item | Aproximado |
|---|---|
| Claude API (Haiku 4.5 default) | ~$5-15/mes uso personal |
| Claude API (Sonnet 4.6 cuando se escala) | +$15-40/mes |
| LiveAvatar LITE (~30 min/día, 1 cred/min) | ~$25-60/mes |
| Whisper | $0 (local) |

**Optimizaciones de tokens ya activas**:
- Default model = Haiku 4.5 (5× más barato que Sonnet, ~$1/MTok in)
- Screenshots reescalados a 1280px ancho max (~75% ahorro tokens vision)
- Prompt caching del system + tool definitions (~90% descuento en repeticiones)

## Licencia

UNLICENSED — uso interno NoCoda.
