import { writeFile, mkdir, unlink, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { app } from "electron";
import type {
  VoiceTranscribeRequest,
  VoiceTranscribeResponse,
} from "../../shared/types.js";

// nodejs-whisper baja el binario whisper.cpp y los modelos la primera vez.
// API: nodewhisper(filePath, { modelName, autoDownloadModelName, ... })
import { nodewhisper } from "nodejs-whisper";

let modelReady = false;

async function ensureModel(): Promise<string> {
  const modelName = process.env.WHISPER_MODEL || "base";
  if (modelReady) return modelName;
  // El paquete maneja el download internamente. Primer llamada será lenta.
  modelReady = true;
  return modelName;
}

export async function transcribe(
  req: VoiceTranscribeRequest
): Promise<VoiceTranscribeResponse> {
  const t0 = Date.now();
  const modelName = await ensureModel();

  // Materializamos el WAV a disco (whisper.cpp lee files).
  const tempDir = join(app.getPath("temp"), "itutor-voice");
  if (!existsSync(tempDir)) await mkdir(tempDir, { recursive: true });
  const wavPath = join(tempDir, `clip-${Date.now()}.wav`);
  const buf = Buffer.from(req.audioBase64, "base64");
  await writeFile(wavPath, buf);

  try {
    const transcript: string = await nodewhisper(wavPath, {
      modelName,
      autoDownloadModelName: modelName,
      removeWavFileAfterTranscription: false,
      withCuda: false,
      logger: console,
      whisperOptions: {
        outputInText: false,
        outputInVtt: false,
        outputInSrt: false,
        outputInCsv: false,
        outputInJson: false,
        translateToEnglish: false,
        wordTimestamps: false,
        timestamps_length: 20,
        splitOnWord: true,
      },
    });
    return {
      text: (transcript ?? "").trim(),
      durationMs: Date.now() - t0,
    };
  } finally {
    unlink(wavPath).catch(() => {});
  }
}
