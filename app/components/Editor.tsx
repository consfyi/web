import { msg } from "@lingui/core/macro";
import { _t, Trans, useLingui } from "@lingui/react/macro";
import { Anchor, Button, Group, Text, TextInput } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import {
  IconCalendar,
  IconMapPin,
  IconTag,
  IconWorld,
} from "@tabler/icons-react";
import { parse as parseDate } from "date-fns";
import PlacePicker from "./PlacePicker";

export interface Entry {
  name: string;
  url: string;
  startDate: string;
  endDate: string;
  location: string;
  country?: string;
  latLng?: [number, number];
  sources?: string[];
  previousInstanceId?: string;
}

function makeDefaultEntry(): Entry {
  return {
    name: "",
    url: "",
    startDate: "",
    endDate: "",
    location: "",
    country: undefined,
    latLng: undefined,
    previousInstanceId: undefined,
  };
}

function guessLanguageForRegion(regionCode: string) {
  // "und" stands for "undetermined language" — like ICU's fallback
  return new Intl.Locale(`und-${regionCode}`).maximize().baseName;
}

function slugify(s: string, locale: string) {
  return s
    .normalize("NFKC")
    .toLocaleLowerCase(locale)
    .replace(/&/g, "and")
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .trim()
    .split(/\s+/)
    .join("-");
}

function fillTemplate({ blob }: { blob: string }) {
  return (t: typeof _t) => `\
${t(msg`If you have any notes, please add them here.`)}

<!-- ${t(msg`DO NOT EDIT ANYTHING BELOW THIS LINE`)} -->
---
\`\`\`
${blob}
\`\`\`\
`;
}

export default function Editor({
  id,
  entry = makeDefaultEntry(),
}: {
  id?: string;
  entry?: Entry;
}) {
  const { i18n, t } = useLingui();

  const form = useForm({
    mode: "controlled",
    initialValues: entry,
    validateInputOnChange: true,
    validate: {
      name: (value) =>
        value == "" ? <Trans>Name must not be empty.</Trans> : null,
      startDate: (value) =>
        value == "" ? <Trans>Start date must be set.</Trans> : null,
      endDate: (value) =>
        value == "" ? <Trans>End date must be set.</Trans> : null,
      location: (value) =>
        value == "" ? <Trans>Location must be set.</Trans> : null,
      url: (value) =>
        value == "" ? (
          <Trans>Website must be set.</Trans>
        ) : value.match(/^https?:\/\//) == null ? (
          <Trans>Website must be a valid URL.</Trans>
        ) : null,
    },
  });

  const startDateInputProps = form.getInputProps("startDate");
  const endDateInputProps = form.getInputProps("endDate");
  const locationInputProps = form.getInputProps("location");

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        const searchParams = new URLSearchParams();
        searchParams.set(
          "title",
          id != null
            ? `Edit convention: ${id}`
            : `New convention: ${slugify(values.name, values.country != null ? guessLanguageForRegion(values.country) : "en")}`,
        );
        searchParams.set(
          "body",
          fillTemplate({ blob: JSON.stringify(values, null, "  ") })(t),
        );
        window.location.href = `https://github.com/consfyi/data/issues/new?${searchParams.toString()}`;
      })}
    >
      <TextInput
        {...form.getInputProps("name")}
        size="sm"
        mb="xs"
        label={<Trans>Name</Trans>}
        description={
          <Trans>
            Include the year or number of the convention, e.g. “RainFurrest
            2016” or “Eurofurence 29”.
          </Trans>
        }
        leftSection={<IconTag size={16} />}
      />
      <DatePickerInput
        size="sm"
        mb="xs"
        type="range"
        allowSingleDateInRange
        valueFormatter={({ date }) => {
          const FORMAT: Intl.DateTimeFormatOptions = {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          };

          const [startDate, endDate] = date as [string, string];

          const refDate = new Date();
          const start =
            startDate != ""
              ? parseDate(startDate, "yyyy-MM-dd", refDate)
              : null;
          const end =
            endDate != "" ? parseDate(endDate, "yyyy-MM-dd", refDate) : null;
          if (start == null && end == null) {
            return "";
          }

          return t({
            // eslint-disable-next-line no-irregular-whitespace
            message: `${start != null ? i18n.date(start, FORMAT) : ""} – ${end != null ? i18n.date(end, FORMAT) : ""}`,
            context: "date range",
          });
        }}
        error={
          startDateInputProps.error != null ||
          endDateInputProps.error != null ? (
            <>
              {startDateInputProps.error} {endDateInputProps.error}
            </>
          ) : null
        }
        defaultValue={[
          startDateInputProps.defaultValue,
          endDateInputProps.defaultValue,
        ]}
        value={[startDateInputProps.value, endDateInputProps.value]}
        onChange={(value) => {
          const [startDate, endDate] = value;
          startDateInputProps.onChange(startDate ?? "");
          endDateInputProps.onChange(endDate ?? "");
        }}
        onFocus={() => {
          startDateInputProps.onFocus();
          endDateInputProps.onFocus();
        }}
        onBlur={() => {
          startDateInputProps.onBlur();
          endDateInputProps.onBlur();
        }}
        leftSection={<IconCalendar size={16} />}
        label={<Trans>Dates</Trans>}
      />
      <TextInput
        {...form.getInputProps("url")}
        size="sm"
        mb="xs"
        leftSection={<IconWorld size={16} />}
        label={<Trans>Website</Trans>}
      />
      <PlacePicker
        size="sm"
        mb="xs"
        error={locationInputProps.error}
        clearable
        leftSection={<IconMapPin size={16} />}
        value={
          form.values.location != null
            ? {
                country: form.values.country,
                latLng: form.values.latLng,
                location: form.values.location,
              }
            : null
        }
        label={<Trans>Location</Trans>}
        onChange={(place) => {
          form.setValues((prev) => ({
            ...prev,
            country: place != null ? place.country : undefined,
            location: place != null ? place.location : "",
            latLng: place != null ? place.latLng : undefined,
          }));
        }}
      />
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed">
          <Trans>
            You must have a{" "}
            <Anchor href="https://github.com" target="_blank">
              GitHub
            </Anchor>{" "}
            account to propose edits.
          </Trans>
        </Text>
        <Button type="submit">
          <Trans>Propose</Trans>
        </Button>
      </Group>
    </form>
  );
}
