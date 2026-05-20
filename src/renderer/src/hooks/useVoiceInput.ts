import { useCallback, useRef, useState } from "react";

/**
 * Push-to-talk via MediaRecorder. Captura WebM, lo convertimos al formato que
 * espera whisper.cpp (16k mono WAV) en el main process (whisper.cpp acepta
 * varios formatos via ffmpeg, pero por seguridad mandamos WAV simple).
 *
 * Estrategia simple: grabamos PCM via AudioContext + ScriptProcessor (legacy
 * pero universal). Para MVP es suficiente.
 */
export function useVoiceInput() {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const bufRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(16000);

  const start = useCallback(async () => {
    if (recording) return;
    bufRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true },
    });
    streamRef.current = stream;
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    sampleRateRef.current = ctx.sampleRate;
    const src = ctx.createMediaStreamSource(stream);
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    procRef.current = proc;
    proc.onaudioprocess = (e) => {
      const chan = e.inputBuffer.getChannelData(0);
      bufRef.current.push(new Float32Array(chan));
    };
    src.connect(proc);
    proc.connect(ctx.destination);
    setRecording(true);
  }, [recording]);

  const stop = useCallback(async (): Promise<string | null> => {
    if (!recording) return null;
    setRecording(false);
    procRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    await ctxRef.current?.close();

    const float32 = concat(bufRef.current);
    bufRef.current = [];
    if (float32.length < 8000) return null; // <0.5s, ignorar

    const wav = encodeWav(float32, sampleRateRef.current, 16000);
    const base64 = arrayBufferToBase64(wav);
    setTranscribing(true);
    try {
      const res = await window.iTutor.voice.transcribe({ audioBase64: base64 });
      return res.text || null;
    } finally {
      setTranscribing(false);
    }
  }, [recording]);

  return { start, stop, recording, transcribing };
}

function concat(parts: Float32Array[]): Float32Array {
  let len = 0;
  for (const p of parts) len += p.length;
  const out = new Float32Array(len);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** Resample (nearest-neighbor + linear) + encode 16-bit PCM WAV mono. */
function encodeWav(
  samples: Float32Array,
  inRate: number,
  outRate: number
): ArrayBuffer {
  const resampled = inRate === outRate ? samples : resample(samples, inRate, outRate);
  const buffer = new ArrayBuffer(44 + resampled.length * 2);
  const view = new DataView(buffer);
  writeStr(view, 0, "RIFF");
  view.setUint32(4, 36 + resampled.length * 2, true);
  writeStr(view, 8, "WAVE");
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, outRate, true);
  view.setUint32(28, outRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(view, 36, "data");
  view.setUint32(40, resampled.length * 2, true);
  let off = 44;
  for (let i = 0; i < resampled.length; i++) {
    const s = Math.max(-1, Math.min(1, resampled[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return buffer;
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function resample(
  samples: Float32Array,
  inRate: number,
  outRate: number
): Float32Array {
  const ratio = inRate / outRate;
  const len = Math.round(samples.length / ratio);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const idx = i * ratio;
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, samples.length - 1);
    const f = idx - lo;
    out[i] = samples[lo] * (1 - f) + samples[hi] * f;
  }
  return out;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(s);
}
