import { useLingui } from "@lingui/react/macro";
import { Fragment, type ReactNode, useEffect } from "react";

let cache: Record<string, Intl.ListFormat | undefined> = {};

export default function IntlList({
  items,
  type = "conjunction",
  style = "long",
}: {
  items: ReactNode[];
  type?: Intl.ListFormatType;
  style?: Intl.ListFormatStyle;
}) {
  const { i18n, t } = useLingui();

  useEffect(() => {
    cache = {};
  }, [t]);

  const cacheKey = `${i18n.locale}:${type}:${style}`;
  const formatter = (cache[cacheKey] ??= new Intl.ListFormat(i18n.locale, {
    style,
    type,
  }));

  const parts = formatter
    .format(items.map((_, i) => `__item${i}__`))
    .split(/(__item\d+__)/g);

  return parts.map((part, i) => {
    const match = part.match(/^__item(\d+)__$/);
    if (match == null) {
      return <Fragment key={`part:${i}`}>{part}</Fragment>;
    }
    const itemIdx = parseInt(match[1], 10);
    return <Fragment key={`item:${itemIdx}`}>{items[itemIdx]}</Fragment>;
  });
}
