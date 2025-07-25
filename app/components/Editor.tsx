import { Trans } from "@lingui/react/macro";
import { TextInput } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import {
  IconCalendar,
  IconMapPin,
  IconTag,
  IconWorld,
} from "@tabler/icons-react";
import { format as formatDate } from "date-fns";
import PlacePicker from "./PlacePicker";

export interface Entry {
  name: string;
  url: string;
  startDate: string;
  endDate: string;
  location: string;
  country: string | null;
  latLng: [number, number] | null;
  sources?: string[];
}

function makeDefaultEntry(): Entry {
  const now = new Date();

  return {
    name: "",
    url: "",
    startDate: formatDate(now, "yyyy-MM-dd"),
    endDate: formatDate(now, "yyyy-MM-dd"),
    location: "",
    country: "",
    latLng: null,
  };
}

export default function Editor({ id, entry }: { id: string; entry: Entry }) {
  const form = useForm({
    mode: "controlled",
    initialValues: makeDefaultEntry(),
    validate: {
      name: (value) => (value != "" ? null : ""),
      startDate: (value) => (value != null ? null : "lig"),
      endDate: (value) => (value != null ? null : "lig"),
    },
  });

  return (
    <>
      <TextInput
        size="sm"
        mb="xs"
        label={<Trans>Name</Trans>}
        leftSection={<IconTag size={16} />}
      />
      <DatePickerInput
        size="sm"
        mb="xs"
        type="range"
        leftSection={<IconCalendar size={16} />}
        label={<Trans>Dates</Trans>}
      />
      <TextInput
        size="sm"
        mb="xs"
        leftSection={<IconWorld size={16} />}
        label={<Trans>Website</Trans>}
      />
      <PlacePicker
        size="sm"
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
            country: place != null ? place.country : null,
            location: place != null ? place.location : undefined,
            latLng: place != null ? place.latLng : null,
          }));
        }}
      />
    </>
  );
}
