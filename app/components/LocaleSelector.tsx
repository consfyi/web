import { useLingui } from "@lingui/react/macro";
import { Select, type SelectProps } from "@mantine/core";
import { IconLanguage } from "@tabler/icons-react";
import { comparing, sorted } from "iter-fns";
import { useMemo } from "react";
import LOCALES from "~/locales";
import { useLinguiContext } from "./LinguiProvider";

export default function LocaleSelector({ ...props }: SelectProps) {
  const { i18n } = useLingui();
  const { setLocale, pending } = useLinguiContext();

  const items = useMemo(
    () =>
      sorted(
        Object.keys(LOCALES).map((locale) => ({
          value: locale,
          label:
            new Intl.DisplayNames(locale, {
              type: "language",
              languageDisplay: "standard",
            }).of(locale) ?? locale,
        })),
        comparing(({ label }) => label),
      ),
    [],
  );

  return (
    <Select
      renderOption={({ option: { value, label } }) => (
        <span lang={value}>{label}</span>
      )}
      withCheckIcon={false}
      leftSection={<IconLanguage stroke={1.5} size={18} />}
      size="xs"
      mb="sm"
      value={i18n.locale}
      disabled={pending}
      onChange={(value) => {
        if (value == null) {
          return;
        }
        setLocale(value);
      }}
      data={items}
      {...props}
    />
  );
}
