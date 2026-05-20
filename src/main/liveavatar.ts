import type { HeygenSessionToken } from "../shared/types.js";

/**
 * Genera un session token efímero de LiveAvatar (sucesor de HeyGen Interactive
 * Avatar) para que el renderer abra el stream WebRTC sin exponer la API key.
 *
 * Doc: POST https://api.liveavatar.com/v1/sessions/token
 *       header `X-API-KEY`
 *       body opcional: { avatar_id, voice_id, mode, language }
 *
 * Modo:
 *   - LITE (1 crédito/min): nosotros aportamos el brain (Claude). LiveAvatar
 *     se ocupa solo del video+TTS+lip-sync. Es el modo recomendado para iTutor.
 *   - FULL (2 créditos/min): incluye ASR+LLM+TTS. No lo usamos.
 *
 * Sign up: https://app.liveavatar.com → Settings → API Key
 */
export async function mintLiveAvatarToken(params: {
  avatarId: string;
  language?: string;
  voiceId?: string;
}): Promise<HeygenSessionToken> {
  const apiKey = process.env.LIVEAVATAR_API_KEY || process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    throw new Error(
      "LIVEAVATAR_API_KEY no está seteada en .env — agregala para usar el avatar. " +
        "Sign up en https://app.liveavatar.com"
    );
  }

  const body: Record<string, unknown> = {
    mode: "LITE",
    avatar_id: params.avatarId,
  };
  if (params.language) body.language = params.language;
  if (params.voiceId) body.voice_id = params.voiceId;

  const res = await fetch("https://api.liveavatar.com/v1/sessions/token", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `LiveAvatar token error: ${res.status} ${await res.text().catch(() => "")}`
    );
  }
  const json = (await res.json()) as {
    session_token?: string;
    token?: string;
    data?: { token?: string; session_token?: string };
  };
  const token =
    json.session_token ??
    json.token ??
    json.data?.session_token ??
    json.data?.token;
  if (!token) {
    throw new Error(
      `LiveAvatar token response sin token reconocible: ${JSON.stringify(json)}`
    );
  }
  return { token };
}
