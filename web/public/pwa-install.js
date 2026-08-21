(() => {
  const DISMISS_KEY = "eventify:pwa-install-dismissed-until";
  const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
  let installPrompt = null;

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js").catch(() => undefined);
    });
  }

  function dismissed() {
    const until = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    return Number.isFinite(until) && until > Date.now();
  }

  function removeCard() {
    document.querySelector("[data-eventify-install]")?.remove();
  }

  function showCard() {
    if (!installPrompt || dismissed() || document.querySelector("[data-eventify-install]")) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const card = document.createElement("aside");
    card.className = "pwa-install";
    card.dataset.eventifyInstall = "true";
    card.setAttribute("aria-label", "Install Eventify");
    card.innerHTML = `
      <div class="pwa-install__mark" aria-hidden="true">E</div>
      <div class="pwa-install__copy">
        <strong>Install Eventify</strong>
        <span>Open it like an app and keep the shell available when your connection drops.</span>
      </div>
      <div class="pwa-install__actions">
        <button type="button" class="pwa-install__primary" data-install>Install</button>
        <button type="button" class="pwa-install__secondary" data-dismiss>Not now</button>
      </div>`;

    card.querySelector("[data-install]")?.addEventListener("click", async () => {
      if (!installPrompt) return;
      await installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      removeCard();
    });

    card.querySelector("[data-dismiss]")?.addEventListener("click", () => {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
      removeCard();
    });

    document.body.append(card);
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    showCard();
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    removeCard();
    window.localStorage.removeItem(DISMISS_KEY);
  });
})();
