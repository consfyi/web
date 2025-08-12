export interface Locale {
  loadMessages(): Promise<{ messages: { [key: string]: string } }>;
  loadDayjsLocale(): Promise<ILocale>;
}

export default {
  "en-US": {
    loadMessages: () => import("./en/messages.po"),
    loadDayjsLocale: () => import("dayjs/locale/en"),
  },
  "en-GB": {
    loadMessages: () => import("./en/messages.po"),
    loadDayjsLocale: () => import("dayjs/locale/en-gb"),
  },
  ja: {
    loadMessages: () => import("./ja/messages.po"),
    loadDayjsLocale: () => import("dayjs/locale/ja"),
  },
  "zh-Hant": {
    loadMessages: () => import("./zh-Hant/messages.po"),
    loadDayjsLocale: () => import("dayjs/locale/zh-tw"),
  },
} as Record<string, Locale>;
