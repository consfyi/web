import { Temporal } from "temporal-polyfill";

export interface KeyDate {
  date: string;
  source?: string;
  asOf?: string;
  confidence?: number;
}

export interface KeyDateEntry {
  opens?: KeyDate;
  closes?: KeyDate;
}

export interface KeyDates {
  registration?: KeyDateEntry;
  hotel?: KeyDateEntry;
  dealers?: KeyDateEntry;
  panels?: KeyDateEntry;
  performances?: KeyDateEntry;
  djs?: KeyDateEntry;
  volunteers?: KeyDateEntry;
}

export interface Event {
  id: string;
  name: string;
  locale: string;
  translations?: Record<
    string,
    {
      name?: string;
      venue?: string;
      address?: string;
    }
  >;
  url: string;
  startDate: Temporal.PlainDate;
  endDate: Temporal.PlainDate;
  venue: string;
  address?: string;
  latLng?: [number, number];
  canceled?: boolean;
  attendance?: number;
  sources?: string[];
  seriesId: string;
  timezone?: string;
  previousAttendance?: number;
  bluesky?: {
    did: string;
    handle?: string;
  };
  keyDates?: KeyDates;
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
  return {
    ...event,
    startDate: Temporal.PlainDate.from(event.startDate),
    endDate: Temporal.PlainDate.from(event.endDate),
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
