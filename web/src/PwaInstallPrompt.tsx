import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "eventify:pwa-install-dismissed-until";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1_000;

function isDismissed(): boolean {
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const until = Number(raw);
  return Number.isFinite(until) && until > Date.now();
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches || isDismissed()) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installEvent) return null;

  const install = async () => {
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
    setInstallEvent(null);
  };

  return (
    <aside className="pwa-install" aria-label="Install Eventify" aria-live="polite">
      <div className="pwa-install__mark" aria-hidden="true">E</div>
      <div className="pwa-install__copy">
        <strong>Install Eventify</strong>
        <span>Open it like an app and keep the shell available when your connection drops.</span>
      </div>
      <div className="pwa-install__actions">
        <button type="button" className="pwa-install__primary" onClick={() => void install()}>Install</button>
        <button type="button" className="pwa-install__secondary" onClick={dismiss}>Not now</button>
      </div>
    </aside>
  );
}
