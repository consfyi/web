import { TZDateMini } from "@date-fns/tz";
import { parse as parseDate } from "date-fns";

interface RawEvent {
  id: string;
  name: string;
  url: string;
  startDate: string;
  endDate: string;
  venue: string;
  address?: string;
  country?: string;
  latLng?: [number, number];
  canceled?: boolean;
  attendance?: number;
  sources?: string[];
  seriesId: string;
  timezone?: string;
  previousAttendance?: number;
}

const ENDPOINT = "https://data.cons.fyi";

function convertRawEvent(event: RawEvent) {
  const refDate = new TZDateMini(new Date(), event.timezone ?? "Utc");
  return {
    ...event,
    startDate: parseDate(event.startDate, "yyyy-MM-dd", refDate),
    endDate: parseDate(event.endDate, "yyyy-MM-dd", refDate),
  };
}

export async function getEvents({ signal }: { signal?: AbortSignal }) {
  const resp = await fetch(`${ENDPOINT}/current.json?${+new Date()}`, {
    signal,
  });
  if (!resp.ok) {
    throw resp;
  }
  return ((await resp.json()) as RawEvent[]).map((event) =>
    convertRawEvent(event),
  );
}

export async function getEvent(
  id: string,
  { signal }: { signal?: AbortSignal },
) {
  const resp = await fetch(`${ENDPOINT}/events/${id}.json?${+new Date()}`, {
    signal,
  });
  if (!resp.ok) {
    throw resp;
  }
  return convertRawEvent((await resp.json()) as RawEvent);
}
