import { useLingui } from "@lingui/react/macro";
import { Box, type BoxProps, Tooltip } from "@mantine/core";
import { useEffect, useMemo } from "react";
import classes from "./Flag.module.css";

let cache: Record<string, string | undefined> = {};

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
        ? Array.prototype.map
            .call(country, (c) =>
              String.fromCodePoint(
                0x1f1e6 + c.charCodeAt(0) - "A".charCodeAt(0),
              ),
            )
            .join("")
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
