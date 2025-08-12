import { useLingui } from "@lingui/react/macro";
import { Box, type BoxProps, Image, Tooltip } from "@mantine/core";
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
      Array.prototype.map
        .call(country, (c) =>
          String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - "A".charCodeAt(0)),
        )
        .join(""),
    [country],
  );

  let countryName;
  if (country != undefined) {
    const cacheKey = `${i18n.locale}:${country}`;
    countryName = cache[cacheKey] ??= new Intl.DisplayNames(i18n.locale, {
      type: "region",
    }).of(country);
  }

  return (
    <Tooltip label={countryName}>
      <Box component="span" {...props} className={classes.flag}>
        {emoji}
      </Box>
    </Tooltip>
  );
}
