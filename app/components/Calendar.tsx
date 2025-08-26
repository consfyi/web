import { useLingui } from "@lingui/react/macro";
import {
  Anchor,
  Box,
  type MantineColor,
  Table,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useDatesContext } from "@mantine/dates";
import {
  addDays,
  addMonths,
  type Day,
  differenceInDays,
  getDate,
  getDay,
  getMonth,
  getYear,
  isBefore,
  isSameDay,
  startOfDay,
} from "date-fns";
import { comparing, map, max, min, Range, sorted, toArray } from "iter-fns";
import {
  type MouseEventHandler,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router";
import { reinterpretAsLocalDate } from "~/date";
import { useNow } from "~/hooks";
import { useHeaderHeight } from "./HeaderHeightProvider";

export interface Event {
  id: string;
  anchor: string;
  link: string;
  title: string;
  label: React.ReactNode;
  start: Date;
  end: Date;
  variant: string;
  color: MantineColor;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

interface Segment {
  index: number;
  offset: number;
  n: number;
  hasStart: boolean;
  hasEnd: boolean;
}

function* resegment(
  offset: number,
  n: number,
  chunkSize: number = 7,
): Iterable<{ offset: number; n: number }> {
  if (offset > 0) {
    const first = chunkSize - offset;
    yield { offset, n: first };
    offset = 0;
    n -= first;
  }

  while (n >= chunkSize) {
    yield { offset, n: chunkSize };
    n -= chunkSize;
  }

  if (n > 0) {
    yield { offset, n };
  }
}

function packLanes(
  segments: Segment[],
  numChunks: number,
  chunkSize: number = 7,
): (Segment | null)[][][] {
  const grid = Array.from({ length: numChunks }, () =>
    Array.from({ length: chunkSize }, () => [] as (Segment | null)[]),
  );

  for (const segment of sorted(
    segments,
    comparing((seg) => seg.offset),
  )) {
    let chunkIndex = Math.floor(segment.offset / chunkSize);
    const resegmented = Array.from(
      resegment(segment.offset % chunkSize, segment.n, chunkSize),
    );
    for (let i = 0; i < resegmented.length; ++i) {
      const seg = resegmented[i];

      const cellIndex = seg.offset % chunkSize;

      if (chunkIndex >= numChunks) {
        continue;
      }

      const chunk = grid[chunkIndex];

      let laneIndex = 0;
      // eslint-disable-next-line no-constant-condition
      findLane: while (true) {
        for (
          let offset = 0;
          offset < seg.n && cellIndex + offset < chunkSize;
          ++offset
        ) {
          if (chunk[cellIndex + offset][laneIndex] !== undefined) {
            ++laneIndex;
            continue findLane;
          }
        }

        chunk[cellIndex][laneIndex] = {
          ...segment,
          offset: seg.offset,
          n: seg.n,
          hasStart: i == 0,
          hasEnd: i == resegmented.length - 1,
        };

        break;
      }

      for (
        let offset = 1;
        offset < seg.n && cellIndex + offset < chunkSize;
        ++offset
      ) {
        chunk[cellIndex + offset][laneIndex] = null;
      }

      ++chunkIndex;
    }
  }

  for (const chunk of grid) {
    for (const cell of chunk) {
      let lastFilled = cell.length - 1;
      while (lastFilled >= 0 && cell[lastFilled] == null) {
        --lastFilled;
      }
      cell.length = lastFilled + 1;
    }
  }

  return grid;
}

function EventSegment({ segment, event }: { segment: Segment; event: Event }) {
  const theme = useMantineTheme();

  const colors = theme.variantColorResolver({
    theme,
    color: event.color,
    variant: event.variant,
  });

  return (
    <Anchor
      id={segment.hasStart ? event.anchor : undefined}
      title={event.title}
      underline="never"
      to={event.link}
      component={Link}
      onClick={event.onClick}
    >
      <Text
        mb={2}
        px="xs"
        py={2}
        pos="relative"
        size="xs"
        c={colors.color}
        w={`calc(${segment.n} * (100% + 1px) - 1px)`}
        left={0}
        truncate
        style={{
          backgroundColor:
            event.variant == "light"
              ? `color-mix(in srgb, var(--mantine-color-${event.color}-filled), var(--mantine-color-body) 90%)`
              : colors.background,
          backgroundSize:
            "calc(1.25rem * var(--mantine-scale)) calc(1.25rem * var(--mantine-scale))",
          // backgroundImage:
          //   "linear-gradient(45deg, hsla(0, 0%, 100%, .5) 25%, transparent 0, transparent 50%, hsla(0, 0%, 100%, .5) 0, hsla(0, 0%, 100%, .5) 75%, transparent 0, transparent)",
          textAlign: "start",
          borderColor:
            event.variant == "light" ? colors.color : colors.background,
          borderStyle: "solid",
          borderTopWidth: "1px",
          borderBottomWidth: "1px",
          borderInlineStartWidth: segment.hasStart ? "1px" : 0,
          borderInlineEndWidth: segment.hasEnd ? "1px" : 0,
          ...(segment.hasStart
            ? {
                borderStartStartRadius: "var(--mantine-radius-xl)",
                borderEndStartRadius: "var(--mantine-radius-xl)",
              }
            : {}),
          ...(segment.hasEnd
            ? {
                borderStartEndRadius: "var(--mantine-radius-xl)",
                borderEndEndRadius: "var(--mantine-radius-xl)",
              }
            : {}),
          zIndex: 1,
        }}
      >
        {event.label}
      </Text>
    </Anchor>
  );
}

function monthKey(date: Date) {
  const d = addDays(date, 6);
  return getYear(d) * 12 + getMonth(d);
}

export default function Calendar({
  events: originalEvents,
  inYourTimeZone,
  includeToday,
}: {
  events: Event[];
  inYourTimeZone: boolean;
  includeToday: boolean;
}) {
  "use no memo";

  const { i18n, t } = useLingui();

  const headerHeight = useHeaderHeight();

  const events = useMemo(
    () =>
      inYourTimeZone
        ? originalEvents
        : originalEvents.map((e) => ({
            ...e,
            start: reinterpretAsLocalDate(e.start),
            end: reinterpretAsLocalDate(e.end),
          })),
    [originalEvents, inYourTimeZone],
  );

  const checkpointRefs = useRef<Record<number, HTMLDivElement>>({});
  checkpointRefs.current = {};

  const observerRef = useRef<IntersectionObserver | null>(null);

  const [visibleMonths, setVisibleMonths] = useState<number[]>([]);

  useLayoutEffect(() => {
    if (observerRef.current != null) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisibleMonths((visibleMonths) => {
          const set = new Set<number>(visibleMonths);
          for (const entry of entries) {
            const k = parseInt(
              (entry.target as HTMLElement).dataset.month!,
              10,
            );
            if (entry.isIntersecting) {
              set.add(k);
            } else {
              set.delete(k);
            }
          }
          return toArray(set);
        });
      },
      { rootMargin: `-${headerHeight}px 0px 0px 0px` },
    );

    for (const el of Object.values(checkpointRefs.current)) {
      observerRef.current.observe(el);
    }

    return () => {
      if (observerRef.current != null) {
        observerRef.current.disconnect();
      }
    };
  }, [headerHeight, events]);

  const now = useNow();

  const datesContext = useDatesContext();

  const dayFormat = useMemo(
    () => new Intl.DateTimeFormat(i18n.locale, { day: "numeric" }),
    [t],
  );

  const dayMonthFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.locale, { month: "short", day: "numeric" }),
    [t],
  );

  const earliestEventDate = useMemo(
    () => min(map(events, (event) => new Date(event.start)))!,
    [events],
  );

  const startDate = useMemo(() => {
    let d = earliestEventDate;
    if (includeToday) {
      d = isBefore(now, d) ? now : d;
    }
    return startOfDay(d);
  }, [includeToday, earliestEventDate, now]);

  const firstDayWeekday = getDay(startDate);
  const daysToPad = (firstDayWeekday - datesContext.firstDayOfWeek + 7) % 7;

  const calendarStartDate = addDays(startDate, -daysToPad);

  const numWeeks = useMemo(
    () =>
      Math.floor(
        differenceInDays(
          max(map(events, (event) => addDays(event.end, 7)))!,
          calendarStartDate,
        ) / 7,
      ),
    [events, calendarStartDate],
  );

  const packed = useMemo(
    () =>
      packLanes(
        events.map((event, i) => ({
          index: i,
          offset: differenceInDays(event.start, calendarStartDate),
          n: differenceInDays(event.end, event.start) + 1,
          hasStart: true,
          hasEnd: true,
        })),
        numWeeks,
      ),
    [calendarStartDate, events, numWeeks],
  );

  const highlightedMonthIndex =
    min(visibleMonths) ?? monthKey(calendarStartDate);

  const titleDate = new Date(
    Math.floor(highlightedMonthIndex / 12),
    highlightedMonthIndex % 12,
    1,
  );

  return (
    <>
      <Title
        mb={-1}
        mx={{ base: 0, lg: "xs" }}
        px={0}
        mt={{ base: -4, lg: -8 }}
        order={2}
        size="h5"
        fw={500}
        pos="sticky"
        top={headerHeight}
        style={{
          zIndex: 3,
          background:
            "color-mix(in srgb, var(--mantine-color-body), transparent 15%)",
          backdropFilter: "blur(5px)",
        }}
      >
        <Text
          fw={500}
          px={{ base: "xs", lg: 0 }}
          pt={{ base: 4, lg: 8 }}
          pb={4}
          c={!isBefore(now, addMonths(titleDate, 1)) ? "gray" : undefined}
        >
          {i18n.date(titleDate, {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <Table
          layout="fixed"
          withColumnBorders
          withRowBorders={false}
          withTableBorder
          style={{
            background:
              "color-mix(in srgb, var(--mantine-color-body), transparent 15%)",
            borderBottom:
              "calc(0.0625rem * var(--mantine-scale)) solid var(--mantine-color-default-border)",
          }}
        >
          <Table.Thead>
            <Table.Tr>
              {toArray(
                map(Range.to(7), (i) => {
                  const d = addDays(calendarStartDate, i);
                  return (
                    <Table.Th
                      key={i}
                      bg={
                        datesContext.weekendDays.includes(getDay(d) as Day)
                          ? "var(--mantine-color-gray-light)"
                          : ""
                      }
                    >
                      <Text size="sm" fw={500}>
                        {i18n.date(d, {
                          weekday: "short",
                        })}
                      </Text>
                    </Table.Th>
                  );
                }),
              )}
            </Table.Tr>
          </Table.Thead>
        </Table>
      </Title>
      <Box mx={{ base: 0, lg: "xs" }} mb={{ base: -1, lg: "xs" }}>
        <Table layout="fixed" withColumnBorders withRowBorders withTableBorder>
          <Table.Tbody>
            <Table.Tr
              data-month={monthKey(calendarStartDate)}
              ref={(el) => {
                if (el == null) {
                  return;
                }

                checkpointRefs.current[monthKey(calendarStartDate)] = el;
              }}
            ></Table.Tr>
            {toArray(
              map(Range.to(numWeeks), (week) => {
                const weekStart = addDays(calendarStartDate, week * 7);
                const lanes = packed[week];

                return (
                  <Table.Tr
                    key={week}
                    data-month={monthKey(weekStart)}
                    ref={(el) => {
                      if (el == null) {
                        return;
                      }

                      if (
                        Math.ceil(
                          (getDate(weekStart) + getDay(weekStart)) / 7,
                        ) == 1
                      ) {
                        checkpointRefs.current[monthKey(weekStart)] = el;
                      }
                    }}
                  >
                    {toArray(
                      map(Range.to(7), (offset) => {
                        const d = addDays(weekStart, offset);
                        const segments = lanes[offset];

                        return (
                          <Table.Td
                            p={0}
                            h={100}
                            key={offset}
                            align="left"
                            valign="top"
                            pos="relative"
                            bg={
                              datesContext.weekendDays.includes(
                                getDay(d) as Day,
                              )
                                ? "var(--mantine-color-gray-light)"
                                : ""
                            }
                          >
                            <Text
                              m="xs"
                              mb={2}
                              size="sm"
                              ta="start"
                              truncate
                              c={
                                isBefore(now, addDays(d, 1)) &&
                                getYear(d) * 12 + getMonth(d) ==
                                  highlightedMonthIndex
                                  ? ""
                                  : "var(--mantine-color-disabled-color)"
                              }
                            >
                              {(getDate(d) == 1 ? dayMonthFormat : dayFormat)
                                .formatToParts(d)
                                .map(({ type, value }, i) => (
                                  <Text
                                    span
                                    key={i}
                                    {...(type == "day"
                                      ? {
                                          fw: 500,
                                          c: isSameDay(d, now)
                                            ? "red"
                                            : undefined,
                                        }
                                      : {})}
                                  >
                                    {value}
                                  </Text>
                                ))}
                            </Text>
                            {segments.map((seg, i) =>
                              seg != null ? (
                                <EventSegment
                                  segment={seg}
                                  event={events[seg.index]}
                                  key={i}
                                />
                              ) : (
                                <Text
                                  key={i}
                                  mb={2}
                                  py={2}
                                  px="xs"
                                  pos="relative"
                                  size="xs"
                                  bd="1px solid transparent"
                                >
                                  &nbsp;
                                </Text>
                              ),
                            )}
                          </Table.Td>
                        );
                      }),
                    )}
                  </Table.Tr>
                );
              }),
            )}
          </Table.Tbody>
        </Table>
      </Box>
    </>
  );
}
