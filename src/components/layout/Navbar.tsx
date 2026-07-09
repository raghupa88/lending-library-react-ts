import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { BookOpen, Menu, Moon, Sun, LogOut, Languages } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useLocale } from "../../context/LocaleContext";
import { Button } from "../ui/button";
import { Avatar } from "../ui/avatar";
import { Sheet } from "../ui/sheet";
import { NotificationBell } from "../../features/notifications/NotificationBell";
import { cn } from "../../lib/cn";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-(--radius-control) px-3 py-2 text-sm font-medium transition-colors",
    isActive ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground",
  );

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // No explicit navigation: public pages keep the user in place and
  // protected routes redirect to /login on their own.
  const handleLogout = () => {
    setMenuOpen(false);
    logout();
  };

  const links = (
    <>
      <NavLink to="/books" className={navLinkClass} onClick={() => setMenuOpen(false)}>
        {t("nav.browse")}
      </NavLink>
      <NavLink to="/learn" className={navLinkClass} onClick={() => setMenuOpen(false)}>
        {t("nav.learn")}
      </NavLink>
      <NavLink to="/plans" className={navLinkClass} onClick={() => setMenuOpen(false)}>
        {t("nav.plans")}
      </NavLink>
      {user && (
        <NavLink to="/dashboard" className={navLinkClass} onClick={() => setMenuOpen(false)}>
          {t("nav.dashboard")}
        </NavLink>
      )}
      {user?.role === "admin" && (
        <NavLink to="/admin" className={navLinkClass} onClick={() => setMenuOpen(false)}>
          {t("nav.admin")}
        </NavLink>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <nav
        aria-label={t("nav.mainLabel")}
        className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6"
      >
        <Link to="/" className="flex items-center gap-2" aria-label={t("nav.homeAriaLabel")}>
          <BookOpen className="size-6 text-accent" aria-hidden="true" />
          <span className="font-display text-xl font-semibold tracking-tight">Suvadi</span>
          <span className="hidden text-sm text-muted sm:inline">{t("nav.tagline")}</span>
        </Link>

        <div className="ml-auto hidden items-center gap-1 md:flex">{links}</div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <button
            type="button"
            onClick={() => setLocale(locale === "en" ? "ta" : "en")}
            aria-label={t("nav.switchLanguage")}
            className="flex items-center gap-1 rounded-(--radius-control) p-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <Languages className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">{locale === "en" ? "EN" : "த"}</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "light" ? t("nav.switchToDark") : t("nav.switchToLight")}
            className="rounded-(--radius-control) p-2 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            {theme === "light" ? (
              <Moon className="size-5" aria-hidden="true" />
            ) : (
              <Sun className="size-5" aria-hidden="true" />
            )}
          </button>

          {user ? (
            <div className="hidden items-center gap-3 md:flex">
              <NotificationBell />
              <Link
                to="/dashboard"
                className="flex items-center gap-2"
                aria-label={t("nav.dashboardFor", { name: user.name })}
              >
                <Avatar name={user.name} />
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut aria-hidden="true" />
                {t("nav.logout")}
              </Button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/login" className="text-sm font-medium text-muted hover:text-foreground">
                {t("nav.signIn")}
              </Link>
              <Button size="sm" onClick={() => navigate("/register")}>
                {t("nav.joinNow")}
              </Button>
            </div>
          )}

          <button
            type="button"
            aria-label={t("nav.openMenu")}
            onClick={() => setMenuOpen(true)}
            className="rounded-(--radius-control) p-2 text-muted hover:bg-surface-2 hover:text-foreground md:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </nav>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={t("nav.menuTitle")}>
        <div className="flex flex-col gap-1">
          {links}
          <hr className="my-2 border-border" />
          {user ? (
            <>
              <div className="flex items-center gap-2 px-3 py-2">
                <Avatar name={user.name} className="size-8" />
                <span className="text-sm font-medium">{user.name}</span>
              </div>
              <Button variant="ghost" size="sm" className="justify-start" onClick={handleLogout}>
                <LogOut aria-hidden="true" />
                {t("nav.logout")}
              </Button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                {t("nav.signIn")}
              </NavLink>
              <NavLink to="/register" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                {t("nav.joinNow")}
              </NavLink>
            </>
          )}
        </div>
      </Sheet>
    </header>
  );
}
