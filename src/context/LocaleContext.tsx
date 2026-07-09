import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { en } from "../i18n/locales/en";
import { ta } from "../i18n/locales/ta";

export type Locale = "en" | "ta";

const dictionaries = { en, ta };

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
};

function initialLocale(): Locale {
  const stored = localStorage.getItem("locale");
  return stored === "ta" ? "ta" : "en";
}

function resolve(dict: unknown, path: string): string | undefined {
  const value = path
    .split(".")
    .reduce<unknown>(
      (acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined),
      dict,
    );
  return typeof value === "string" ? value : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ""));
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.setAttribute("data-locale", locale);
    localStorage.setItem("locale", locale);
  }, [locale]);

  const t = useMemo(
    () => (key: string, vars?: Record<string, string | number>) => {
      const template = resolve(dictionaries[locale], key) ?? resolve(dictionaries.en, key) ?? key;
      return interpolate(template, vars);
    },
    [locale],
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>
  );
}
