import { match } from "@formatjs/intl-localematcher";
import { i18n, type Locale } from "@lingui/core";
import { I18nProvider, type I18nProviderProps } from "@lingui/react";
import { type Direction, useDirection } from "@mantine/core";
import DEFAULT_DAYJS_LOCALE from "dayjs/locale/en";
import IntlLocale from "intl-locale-textinfo-polyfill";
import { createContext, useContext, useEffect, useState } from "react";
import LOCALES from "~/locales";

const LOCALE_KEY = "fbl:locale";

function getInitialLocales(): Locale[] {
  const locales: string[] = [];

  if (typeof window !== "undefined") {
    const searchParams = new URLSearchParams(window.location.search);
    locales.push(...searchParams.getAll("lang"));

    const storedLocale = window.localStorage.getItem(LOCALE_KEY);
    if (storedLocale != null) {
      locales.push(storedLocale);
    }
    locales.push(...window.navigator.languages);
  }

  return locales;
}

export const INITIAL_LOCALE = match(
  getInitialLocales(),
  Object.keys(LOCALES),
  "en-US",
);

export function getExtendedRequestedLocales(locale: string) {
  const l = new Intl.Locale(locale).maximize();
  return [
    // The actual locale, if possible.
    locale,

    // Anything in the same script, e.g. fr -> und-Latn -> en.
    `und-${l.script}`,

    // If Japanese, show zh-Hant then zh-Hans, in that order.
    ...(l.script == "Jpan" ? ["zh-Hant", "zh-Hans"] : []),

    // Last resort fallback.
    "und-Latn",
  ];
}

const LinguiContext = createContext<{
  dayjsLocale: ILocale;
  locale: string;
  pending: boolean;
  setLocale: (locale: Locale) => void;
} | null>(null);

export default function LinguiProvider(props: Omit<I18nProviderProps, "i18n">) {
  const [pending, setPending] = useState(false);

  const [locale, setLocale] = useState(INITIAL_LOCALE);
  const [dayjsLocale, setDayjsLocale] = useState<ILocale>(DEFAULT_DAYJS_LOCALE);

  const { setDirection } = useDirection();

  useEffect(() => {
    (async () => {
      if (locale == i18n.locale) {
        return;
      }

      setPending(true);
      const localeDef = LOCALES[locale];
      const [{ messages }, dayjsLocale] = await Promise.all([
        localeDef.loadMessages(),
        localeDef.loadDayjsLocale(),
      ]);
      i18n.loadAndActivate({ locale, messages });
      setDayjsLocale(dayjsLocale);
      setDirection(new IntlLocale(locale).textInfo.direction as Direction);
      window.localStorage.setItem(LOCALE_KEY, locale);
      document.documentElement.lang = locale;
      setPending(false);
    })();
  }, [locale, setDirection, setDayjsLocale, setPending]);

  return (
    <LinguiContext.Provider value={{ locale, pending, setLocale, dayjsLocale }}>
      <I18nProvider i18n={i18n} {...props} />
    </LinguiContext.Provider>
  );
}

export function useLinguiContext() {
  return useContext(LinguiContext)!;
}
