import { match } from "@formatjs/intl-localematcher";
import { i18n, type Locale } from "@lingui/core";
import { I18nProvider, type I18nProviderProps } from "@lingui/react";
import { type Direction, useDirection } from "@mantine/core";
import DEFAULT_DAYJS_LOCALE from "dayjs/locale/en";
import IntlLocale from "intl-locale-textinfo-polyfill";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import LOCALES from "~/locales";

const LOCALE_KEY = "fbl:locale";

function getRequestedLocales(): Locale[] {
  const requestedLocales: string[] = [];

  if (typeof window !== "undefined") {
    const searchParams = new URLSearchParams(window.location.search);
    requestedLocales.push(...searchParams.getAll("lang"));

    const storedLocale = window.localStorage.getItem(LOCALE_KEY);
    if (storedLocale != null) {
      requestedLocales.push(storedLocale);
    }
    requestedLocales.push(...window.navigator.languages);
  }

  return requestedLocales;
}

export const INITIAL_LOCALE = match(
  getRequestedLocales(),
  Object.keys(LOCALES),
  "en-US",
);

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

  const loadAndActivate = useCallback(
    (locale: string) => {
      return (async () => {
        const { messages } = await LOCALES[locale].loadMessages();
        i18n.loadAndActivate({ locale, messages });
        setDayjsLocale(await LOCALES[locale].loadDayjsLocale());
        setDirection(new IntlLocale(locale).textInfo.direction as Direction);
        window.localStorage.setItem(LOCALE_KEY, locale);
      })();
    },
    [setDirection],
  );

  useEffect(() => {
    (async () => {
      await loadAndActivate(INITIAL_LOCALE);
    })();
  }, [loadAndActivate]);

  useEffect(() => {
    (async () => {
      setPending(true);
      await loadAndActivate(locale);
      document.documentElement.lang = locale;
      setPending(false);
    })();
  }, [locale, loadAndActivate, setPending]);

  return (
    <LinguiContext.Provider value={{ locale, pending, setLocale, dayjsLocale }}>
      <I18nProvider i18n={i18n} {...props} />
    </LinguiContext.Provider>
  );
}

export function useLinguiContext() {
  return useContext(LinguiContext)!;
}
