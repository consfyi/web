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

  return formatter.formatToParts(items.map((_, i) => `${i}`)).map((p, i) => {
    switch (p.type) {
      case "literal": {
        return <Fragment key={`literal:${i}`}>{p.value}</Fragment>;
      }
      case "element": {
        const itemIdx = parseInt(p.value, 10);
        return <Fragment key={`item:${itemIdx}`}>{items[itemIdx]}</Fragment>;
      }
    }
  });
}
