"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/** Registers the offline worker once the page has loaded (production builds only). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    // Checking for a new worker on every page load means a fix reaches phones on their next visit.
    const register = () =>
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => reg.update())
        .catch(() => undefined);
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * "Install the app". Android and desktop Chrome get the browser's own install
 * prompt; iPhone gets the two steps to add it from Safari. Hidden once the
 * app is installed and running on its own.
 */
export function InstallApp({ className = "" }: { className?: string }) {
  const t = useTranslations("pwa");
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!prompt && !ios)) return null;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        type="button"
        onClick={async () => {
          if (prompt) {
            await prompt.prompt();
            if ((await prompt.userChoice).outcome === "accepted") setInstalled(true);
            setPrompt(null);
          } else setHelp((v) => !v);
        }}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-saffron px-5 font-bold text-ink shadow-[inset_0_-3px_0_var(--color-saffron-deep)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
        </svg>
        {t("install")}
      </button>
      {help ? (
        <p role="status" className="rounded-md bg-paper px-4 py-3 text-[14px] leading-relaxed text-ink-2">
          {t("ios")}
        </p>
      ) : null}
    </div>
  );
}
