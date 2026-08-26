import React, { useEffect, useState } from "react";
import { X, Rocket, Smartphone, BookOpen, MessageCircle } from "lucide-react";
import { ANDROID_APK_URL, GUIDE_PDF_URL, FEEDBACK_MAILTO } from "@/config/betaLinks";

const DISMISS_KEY = "dla_beta_bar_dismissed";

/**
 * Beta-testing announcement bar shown under the Header on every page.
 * Session-only dismissal (sessionStorage, not localStorage) — closing it
 * hides it until the browser tab is closed, per spec; no backend involved.
 */
export default function BetaAnnouncementBar() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (dismissed) return null;

  const close = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const MarqueeContent = () => (
    <div className="flex items-center gap-6 pr-12 shrink-0">
      <span className="flex items-center gap-1.5 font-semibold text-sm">
        <Rocket className="w-4 h-4" /> DealLakay nan faz tès!
      </span>
      <span className="text-sm text-primary-foreground/85">Ede nou teste nouvo platfòm la</span>
      <a
        href={ANDROID_APK_URL}
        data-testid="beta-bar-app-link"
        className="flex items-center gap-1.5 text-xs font-semibold bg-secondary text-secondary-foreground px-3 py-1 rounded-full hover:brightness-95 transition"
      >
        <Smartphone className="w-3.5 h-3.5" /> Telechaje App la
      </a>
      <a
        href={GUIDE_PDF_URL}
        download
        data-testid="beta-bar-guide-link"
        className="flex items-center gap-1.5 text-sm underline underline-offset-2 decoration-primary-foreground/40 hover:decoration-primary-foreground"
      >
        <BookOpen className="w-3.5 h-3.5" /> Gade Gid la
      </a>
      <a
        href={FEEDBACK_MAILTO}
        data-testid="beta-bar-feedback-link"
        className="flex items-center gap-1.5 text-sm underline underline-offset-2 decoration-primary-foreground/40 hover:decoration-primary-foreground"
      >
        <MessageCircle className="w-3.5 h-3.5" /> Bay Feedback
      </a>
    </div>
  );

  return (
    <div
      role="region"
      aria-label="Anons tès beta DealLakay"
      className="bg-primary text-primary-foreground overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-3 md:px-6 h-11 md:h-12 flex items-center gap-2">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="beta-marquee-track flex items-center w-max whitespace-nowrap">
            <MarqueeContent />
            <MarqueeContent aria-hidden="true" />
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Fèmen anons lan"
          data-testid="beta-bar-close"
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
