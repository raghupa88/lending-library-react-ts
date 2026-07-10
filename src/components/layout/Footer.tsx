import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { useIsFeatureEnabled } from "../../features/feature-flags/queries";

export function Footer() {
  const { t } = useLocale();
  const b2bTierEnabled = useIsFeatureEnabled("b2b_tier");
  return (
    <footer className="mt-16 border-t border-border bg-surface-2">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-accent" aria-hidden="true" />
            <span className="font-display text-lg font-semibold">Suvadi</span>
          </div>
          <p className="mt-2 max-w-xs text-sm text-muted">{t("footer.tagline")}</p>
        </div>
        <nav aria-label={t("footer.footerAriaLabel")} className="text-sm">
          <h2 className="mb-2 font-semibold">{t("footer.exploreHeading")}</h2>
          <ul className="space-y-1.5">
            <li>
              <Link to="/books" className="text-muted hover:text-foreground">
                {t("footer.browseBooks")}
              </Link>
            </li>
            <li>
              <Link to="/register" className="text-muted hover:text-foreground">
                {t("footer.becomeMember")}
              </Link>
            </li>
            <li>
              <Link to="/gift" className="text-muted hover:text-foreground">
                {t("footer.giftSubscription")}
              </Link>
            </li>
            {b2bTierEnabled && (
              <li>
                <Link to="/organization" className="text-muted hover:text-foreground">
                  For schools & businesses
                </Link>
              </li>
            )}
            <li>
              <Link to="/login" className="text-muted hover:text-foreground">
                {t("footer.signIn")}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="text-sm">
          <h2 className="mb-2 font-semibold">{t("footer.contactHeading")}</h2>
          <p className="text-muted">support@suvadilibrary.com</p>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted">
        {t("footer.copyright", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
