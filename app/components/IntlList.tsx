import { useLingui } from "@lingui/react/macro";
import { Fragment, type ReactNode, useEffect, useMemo } from "react";

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

  const formatter = useMemo(() => {
    void t;
    return (cache[`${i18n.locale}:${type}:${style}`] ??= new Intl.ListFormat(
      i18n.locale,
      {
        type,
        style,
      },
    ));
  }, [type, style, t, i18n.locale]);

  return formatter
    .formatToParts(items.map((_, i) => `${i}`))
    .map(({ type, value }, i) => {
      switch (type) {
        case "literal": {
          return <Fragment key={`literal:${i}`}>{value}</Fragment>;
        }
        case "element": {
          const itemIdx = parseInt(value, 10);
          return (
            <Fragment key={`element:${itemIdx}`}>{items[itemIdx]}</Fragment>
          );
        }
      }
    });
}
