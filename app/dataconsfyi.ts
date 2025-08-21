import { type TZDate, TZDateMini } from "@date-fns/tz";
import { parse as parseDate } from "date-fns";

export interface Event {
  id: string;
  name: string;
  locale: string;
  url: string;
  startDate: TZDate;
  endDate: TZDate;
  venue: string;
  address?: string;
  latLng?: [number, number];
  canceled?: boolean;
  attendance?: number;
  sources?: string[];
  seriesId: string;
  timezone?: string;
  previousAttendance?: number;
}

const ENDPOINT = "https://data.cons.fyi";

interface RequestOptions {
  signal?: AbortSignal;
}

type RawEvent = Omit<Event, "startDate" | "endDate"> & {
  startDate: string;
  endDate: string;
};

function convertRawEvent(event: RawEvent): Event {
  const refDate = new TZDateMini(new Date(), event.timezone ?? "Utc");
  return {
    ...event,
    startDate: parseDate(event.startDate, "yyyy-MM-dd", refDate),
    endDate: parseDate(event.endDate, "yyyy-MM-dd", refDate),
  };
}

async function* streamLines(
  body: ReadableStream<Uint8Array>,
  encoding = "utf-8",
) {
  const reader = body.getReader();
  const decoder = new TextDecoder(encoding);
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer != "") {
        yield buffer;
      }
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop()!;
    yield* lines;
  }
}

export async function* getEvents({ signal }: RequestOptions = {}) {
  const resp = await fetch(`${ENDPOINT}/current.jsonl?${+new Date()}`, {
    signal,
  });
  if (!resp.ok) {
    throw resp;
  }
  for await (const line of streamLines(resp.body!)) {
    yield convertRawEvent(JSON.parse(line));
  }
}

export async function getEvent(id: string, { signal }: RequestOptions = {}) {
  const resp = await fetch(`${ENDPOINT}/events/${id}.json?${+new Date()}`, {
    signal,
  });
  if (!resp.ok) {
    throw resp;
  }
  return convertRawEvent((await resp.json()) as RawEvent);
}
