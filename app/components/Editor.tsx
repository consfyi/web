import { TextInput } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { format as formatDate } from "date-fns";

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
  // const form = useForm({
  //   mode: "controlled",
  //   initialValues: entry,
  //   validate: {
  //     name: (value) => (value != "" ? null : ""),
  //     startDate: (value) => (value != null ? null : "lig"),
  //     endDate: (value) => (value != null ? null : "lig"),
  //   },
  // });

  return (
    <>
      <TextInput label="Name" size="lg" mb="xs" />
      <DatePicker type="range" numberOfColumns={2} />
    </>
  );
}
