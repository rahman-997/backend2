import { useEffect, useState, type ReactNode } from "react";
import { CloudOff, ServerCog, Wifi } from "lucide-react";

type RuntimeState = "healthy" | "degraded" | "offline";

export function RuntimeGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RuntimeState>(navigator.onLine ? "healthy" : "offline");

  useEffect(() => {
    let disposed = false;

    const check = async () => {
      if (!navigator.onLine) {
        if (!disposed) setState("offline");
        return;
      }
      try {
        const response = await fetch("/api/ready", {
          credentials: "include",
          cache: "no-store",
          signal: AbortSignal.timeout(4_000),
        });
        if (!disposed) setState(response.ok ? "healthy" : "degraded");
      } catch {
        if (!disposed) setState(navigator.onLine ? "degraded" : "offline");
      }
    };

    const online = () => void check();
    const offline = () => setState("offline");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    void check();
    const timer = window.setInterval(() => void check(), 30_000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  return (
    <>
      <a className="runtime-skip-link" href="#top">Skip to main content</a>
      {children}
      {state !== "healthy" && (
        <div className={`runtime-status runtime-${state}`} role="status" aria-live="polite">
          {state === "offline" ? <CloudOff size={18} /> : <ServerCog size={18} />}
          <div>
            <strong>{state === "offline" ? "You are offline" : "Eventify is reconnecting"}</strong>
            <span>{state === "offline" ? "Browse what is already on screen; server actions will resume after your connection returns." : "The interface is available, but a backend dependency is temporarily degraded."}</span>
          </div>
          {state === "degraded" && <Wifi size={17} className="runtime-pulse" aria-hidden="true" />}
        </div>
      )}
    </>
  );
}
