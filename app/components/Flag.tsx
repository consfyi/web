import { useLingui } from "@lingui/react/macro";
import { Box, type BoxProps, Tooltip } from "@mantine/core";
import { useEffect, useMemo } from "react";
import classes from "./Flag.module.css";

let cache: Record<string, string | undefined> = {};

const REGIONAL_INDICATOR_SYMBOL_LETTER_A_CODEPOINT = "🇦".codePointAt(0)!;
const CAPITAL_LETTER_A_CODEPOINT = "A".codePointAt(0)!;

function letterToRegionalIndicator(c: string): string {
  return String.fromCodePoint(
    REGIONAL_INDICATOR_SYMBOL_LETTER_A_CODEPOINT +
      c.codePointAt(0)! -
      CAPITAL_LETTER_A_CODEPOINT,
  );
}

export default function Flag({
  country,
  ...props
}: { country?: string } & Omit<BoxProps, "w" | "h">) {
  const { i18n, t } = useLingui();

  useEffect(() => {
    cache = {};
  }, [t]);

  const emoji = useMemo(
    () =>
      country != null
        ? Array.prototype.map.call(country, letterToRegionalIndicator).join("")
        : "🏴",
    [country],
  );

  const countryName =
    country != null
      ? (cache[`${i18n.locale}:${country}`] ??= new Intl.DisplayNames(
          i18n.locale,
          {
            type: "region",
          },
        ).of(country))
      : t`Unknown`;

  return (
    <Tooltip label={countryName}>
      <Box component="span" {...props} className={classes.flag}>
        {emoji}
      </Box>
    </Tooltip>
  );
}
