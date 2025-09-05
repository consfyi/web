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
import { type DayOfWeek, useDatesContext } from "@mantine/dates";
import { map, max, min, Range, toArray } from "iter-fns";
import {
  type MouseEventHandler,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation } from "react-router";
import { Temporal, Intl as TemporalIntl } from "temporal-polyfill";
import { useNow } from "~/hooks";
import classes from "./Calendar.module.css";
import layout, { type Segment } from "./Calendar/layout";
import { useHeaderHeight } from "./HeaderHeightProvider";

export interface Event {
  id: string;
  anchor: string;
  link: string;
  title: string;
  label: React.ReactNode;
  startDate: Temporal.PlainDate;
  endDate: Temporal.PlainDate;
  variant: string;
  color: MantineColor;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
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
      className={classes.segment}
    >
      <Text
        component={"div"}
        mb={2}
        px="xs"
        py={2}
        pos="relative"
        className={classes.inner}
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

function yearMonthKey(d: Temporal.PlainDate) {
  d = d.add({ days: 6 });
  return d.year * 12 + d.month - 1;
}

export default function Calendar({
  events,
  includeToday,
}: {
  events: Event[];
  includeToday: boolean;
}) {
  "use no memo";

  const location = useLocation();

  const selectedEvent = useMemo(() => {
    if (location.hash == "") {
      return null;
    }
    const slug = decodeURIComponent(location.hash.slice(1));
    return events.find((event) => event.id == slug) ?? null;
  }, [events, location.hash]);

  useLayoutEffect(() => {
    if (selectedEvent == null) {
      return;
    }

    const element = document.getElementById(selectedEvent.id);
    if (element == null) {
      return;
    }

    setTimeout(() => {
      element.scrollIntoView({ behavior: "smooth" });
      element.focus({ preventScroll: true });
    }, 1);
  }, [selectedEvent]);

  const { i18n, t } = useLingui();

  const headerHeight = useHeaderHeight();

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

  const now = useNow().toPlainDate();

  const datesContext = useDatesContext();

  const dayFormat = useMemo(
    () => new TemporalIntl.DateTimeFormat(i18n.locale, { day: "numeric" }),
    [t],
  );

  const dayMonthFormat = useMemo(
    () =>
      new TemporalIntl.DateTimeFormat(i18n.locale, {
        month: "short",
        day: "numeric",
      }),
    [t],
  );

  const earliestEventDate = useMemo(
    () =>
      min(
        map(events, (event) => event.startDate),
        Temporal.PlainDate.compare,
      )!,
    [events],
  );

  const packStartDate = earliestEventDate.subtract({
    days:
      ((earliestEventDate.dayOfWeek % 7) - datesContext.firstDayOfWeek + 7) % 7,
  });

  const numWeeksToPack = useMemo(
    () =>
      Math.floor(
        max(
          map(events, (event) => event.endDate.add({ days: 7 })),
          Temporal.PlainDate.compare,
        )!.since(packStartDate).days / 7,
      ),
    [events, packStartDate],
  );

  const grid = useMemo(
    () =>
      layout(
        events.map((event, i) => ({
          index: i,
          offset: event.startDate.since(packStartDate).days,
          n: event.endDate.since(event.startDate).days + 1,
          hasStart: true,
          hasEnd: true,
        })),
        numWeeksToPack,
      ),
    [packStartDate, events, numWeeksToPack],
  );

  const startDate =
    includeToday ||
    Temporal.PlainDate.compare(
      packStartDate,
      now.toPlainDateTime().toPlainDate(),
    ) < 0
      ? now
      : packStartDate;

  const calendarStartDate = startDate.subtract({
    days: ((startDate.dayOfWeek % 7) - datesContext.firstDayOfWeek + 7) % 7,
  });

  const highlightedMonthIndex =
    min(visibleMonths) ?? yearMonthKey(calendarStartDate);

  const titleDate = new Temporal.PlainDate(
    Math.floor(highlightedMonthIndex / 12),
    (highlightedMonthIndex % 12) + 1,
    1,
  );

  return (
    <>
      <style>{`html { scroll-padding-top: ${headerHeight + 78}px; }`}</style>
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
          c={
            Temporal.PlainDate.compare(
              now.toPlainDateTime().toPlainDate(),
              titleDate.add({ months: 1 }),
            ) >= 0
              ? "gray"
              : undefined
          }
        >
          {titleDate.toLocaleString(i18n.locale, {
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
                  const d = calendarStartDate.add({ days: i });
                  return (
                    <Table.Th
                      key={i}
                      bg={
                        datesContext.weekendDays.includes(
                          (d.dayOfWeek % 7) as DayOfWeek,
                        )
                          ? "var(--mantine-color-gray-light)"
                          : ""
                      }
                    >
                      <Text size="sm" fw={500}>
                        {d.toLocaleString(i18n.locale, { weekday: "short" })}
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
              data-month={yearMonthKey(calendarStartDate)}
              ref={(el) => {
                if (el == null) {
                  return;
                }

                checkpointRefs.current[yearMonthKey(calendarStartDate)] = el;
              }}
            ></Table.Tr>
            {toArray(
              map(
                Range.from(calendarStartDate.since(packStartDate).days / 7).to(
                  grid.length,
                ),
                (week) => {
                  const weekStart = packStartDate.add({
                    days: week * 7,
                  });
                  const lanes = grid[week] ?? [];

                  return (
                    <Table.Tr
                      key={week}
                      data-month={yearMonthKey(weekStart)}
                      ref={(el) => {
                        if (el == null) {
                          return;
                        }

                        if (
                          Math.ceil(
                            (weekStart.day + (weekStart.dayOfWeek % 7)) / 7,
                          ) == 1
                        ) {
                          checkpointRefs.current[yearMonthKey(weekStart)] = el;
                        }
                      }}
                    >
                      {toArray(
                        map(Range.to(7), (offset) => {
                          const d = weekStart.add({ days: offset });
                          const segments = lanes[offset] ?? [];

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
                                  (d.dayOfWeek % 7) as DayOfWeek,
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
                                  Temporal.PlainDate.compare(
                                    now,
                                    d.add({ days: 1 }),
                                  ) < 0 &&
                                  d.year * 12 + d.month ==
                                    highlightedMonthIndex + 1
                                    ? ""
                                    : "var(--mantine-color-disabled-color)"
                                }
                              >
                                {(d.day == 1 ? dayMonthFormat : dayFormat)
                                  .formatToParts(d)
                                  .map(({ type, value }, i) => (
                                    <Text
                                      span
                                      key={i}
                                      {...(type == "day"
                                        ? {
                                            fw: 500,
                                            c:
                                              Temporal.PlainDate.compare(
                                                d,
                                                now
                                                  .toPlainDateTime()
                                                  .toPlainDate(),
                                              ) == 0
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
                },
              ),
            )}
          </Table.Tbody>
        </Table>
      </Box>
    </>
  );
}
