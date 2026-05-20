import { useEffect, useState } from "react";
import { FrostedShell } from "./components/FrostedShell";
import { HeaderBar } from "./components/HeaderBar";
import { AvatarStage } from "./components/AvatarStage";
import { ChatPane } from "./components/ChatPane";
import { Composer } from "./components/Composer";
import { StopBanner } from "./components/StopBanner";
import type { AppSettings } from "@shared/types";

export function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    window.iTutor.settings.get().then(setSettings);
  }, []);

  if (!settings) {
    return (
      <FrostedShell>
        <div className="flex h-full items-center justify-center text-white/50">
          Cargando…
        </div>
      </FrostedShell>
    );
  }

  return (
    <FrostedShell>
      <HeaderBar />
      {settings.avatarEnabled && (
        <AvatarStage
          avatarId={settings.heygenAvatarId}
          language={settings.heygenLanguage}
          enabled={settings.avatarEnabled}
        />
      )}
      <ChatPane />
      <StopBanner />
      <Composer />
    </FrostedShell>
  );
}
