import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Box,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Menu,
  Text,
  Title,
} from "@mantine/core";
import {
  IconCheck,
  IconChevronDown,
  IconSortAscendingLetters,
  IconSortAscendingNumbers,
  IconSortDescendingLetters,
  IconSortDescendingNumbers,
} from "@tabler/icons-react";
import { addMonths, getMonth, getYear, setDate } from "date-fns";
import { compareMany, comparing, equaling, group, sorted } from "iter-fns";
import { type ReactNode, Suspense, useMemo, useState } from "react";
import absurd from "~/absurd";
import { reinterpretAsLocalDate } from "~/date";
import {
  type Event,
  type EventWithPost,
  useFollowedEventAttendees,
  useFollowedEventAttendeesDLE,
  useIsLoggedIn,
  useNow,
} from "~/hooks";
import * as qp from "~/qp";
import EmptyIcon from "../EmptyIcon";
import EmptyState from "../EmptyState";
import EventRow from "../EventRow";
import FilterBar, {
  FilterOptions,
  LayoutSwitcher,
  useFilterPredicate,
} from "../FilterBar";

function FlatList({
  title,
  events,
  sortDesc,
  density,
}: {
  title: ReactNode | null;
  events: Event[];
  sortDesc: boolean;
  density: Density;
}) {
  const sortedEvents = useMemo(() => {
    const sortedEvents = events.slice();
    if (sortDesc) {
      sortedEvents.reverse();
    }
    return sortedEvents;
  }, [events, sortDesc]);

  const now = useNow();

  return (
    <>
      {title != null ? (
        <Title
          mb="sm"
          px={{ base: 0, lg: "xs" }}
          mt={{ base: -4, lg: -8 }}
          order={2}
          size="h5"
          fw={500}
          pos="sticky"
          top={50}
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
            style={{
              borderBottom:
                "calc(0.0625rem * var(--mantine-scale)) solid var(--mantine-color-default-border)",
            }}
          >
            {title}
          </Text>
        </Title>
      ) : null}
      <Box px="xs">
        {sortedEvents.map((event) => {
          return (
            <Box key={event.id} mb={density == "compact" ? "xs" : "sm"}>
              <EventRow
                event={event}
                showMonthInIcon={false}
                showLocation="inline"
                showFollowed
                showLikeButton
                showYear={false}
                density={density}
                withId
              />
            </Box>
          );
        })}
      </Box>
    </>
  );
}

function GroupedList({
  groups,
  sortDesc,
  density,
}: {
  groups: { key: string; title: ReactNode; events: Event[] }[];
  sortDesc: boolean;
  density: Density;
}) {
  const sortedGroups = useMemo(() => {
    const sortedGroups = groups.slice();
    if (sortDesc) {
      sortedGroups.reverse();
    }
    return sortedGroups;
  }, [groups, sortDesc]);

  return (
    <>
      {sortedGroups.map(({ key, title, events }) => (
        <FlatList
          events={events}
          key={key}
          title={title}
          sortDesc={sortDesc}
          density={density}
        />
      ))}
    </>
  );
}

function yearMonthKey(d: Date) {
  return getYear(d) * 12 + getMonth(d);
}

function EventsByDate({
  events,
  hideEmptyGroups,
  sortDesc,
  density,
}: {
  events: Event[];
  hideEmptyGroups: boolean;
  sortDesc: boolean;
  density: Density;
}) {
  const { i18n, t } = useLingui();

  const groups = useMemo(
    () => {
      if (events.length == 0) {
        return [];
      }

      const grouped: Record<number, Event[]> = {};
      for (const g of group(
        events,
        equaling((event) => yearMonthKey(reinterpretAsLocalDate(event.start))),
      )) {
        const k = yearMonthKey(reinterpretAsLocalDate(g[0].start));
        (grouped[k] ??= []).push(...g);
      }

      const groups = [];
      for (
        let d = setDate(reinterpretAsLocalDate(events![0].start), 1),
          endDate = addMonths(
            setDate(
              reinterpretAsLocalDate(events![events!.length - 1].start),
              1,
            ),
            1,
          );
        d < endDate;
        d = addMonths(d, 1)
      ) {
        const key = yearMonthKey(d);
        const events = grouped[key] ?? [];

        if (hideEmptyGroups && events.length == 0) {
          continue;
        }

        groups.push({
          key: key.toString(),
          events,
          title: (
            <>
              {i18n.date(d, {
                month: "long",
                year: "numeric",
              })}
            </>
          ),
        });
      }
      return groups;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, t],
  );

  return <GroupedList groups={groups} sortDesc={sortDesc} density={density} />;
}

function EventsByAttendees({
  events,
  sortDesc,
  density,
}: {
  events: EventWithPost[];
  sortDesc: boolean;
  density: Density;
}) {
  const sortedEvents = useMemo(
    () =>
      sorted(
        events,
        comparing((event) => event.post.likeCount),
      ),
    [events],
  );

  return (
    <FlatList
      title={null}
      events={sortedEvents}
      density={density}
      sortDesc={sortDesc}
    />
  );
}

function EventsByFollowed({
  events,
  sortDesc,
  density,
}: {
  events: EventWithPost[];
  sortDesc: boolean;
  density: Density;
}) {
  const followedEventAttendees = useFollowedEventAttendees();

  const sortedEvents = useMemo(
    () =>
      sorted(
        events,
        compareMany(
          comparing((event) =>
            followedEventAttendees == null
              ? event.post.likeCount
              : (followedEventAttendees[event.id] ?? []).length,
          ),
          comparing((event) => event.post.likeCount),
        ),
      ),
    [events, followedEventAttendees],
  );

  return (
    <FlatList
      title={null}
      events={sortedEvents}
      density={density}
      sortDesc={sortDesc}
    />
  );
}

function EventsByName({
  events,
  sortDesc,
  density,
}: {
  events: Event[];
  sortDesc: boolean;
  density: Density;
}) {
  const { i18n, t } = useLingui();

  const sortedEvents = useMemo(
    () => {
      const collator = new Intl.Collator(i18n.locale);
      return sorted(events, (x, y) => collator.compare(x.name, y.name));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, t],
  );

  return (
    <FlatList
      title={null}
      events={sortedEvents}
      density={density}
      sortDesc={sortDesc}
    />
  );
}

const DENSITY = ["comfortable", "cozy", "compact"] as const;
type Density = (typeof DENSITY)[number];

const SORT_BY_OPTIONS = {
  date: {
    name: msg`Date`,
    asc: msg`Soonest to latest`,
    AscIcon: IconSortAscendingNumbers,
    desc: msg`Latest to soonest`,
    DescIcon: IconSortDescendingNumbers,
    defaultDesc: false,
  },
  name: {
    name: msg`Name`,
    asc: msg`A to Z`,
    AscIcon: IconSortAscendingLetters,
    desc: msg`Z to A`,
    DescIcon: IconSortDescendingLetters,
    defaultDesc: false,
  },
  attendees: {
    name: msg({ message: `People going`, context: "number of people going" }),
    asc: msg`Fewest to most`,
    AscIcon: IconSortAscendingNumbers,
    desc: msg`Most to fewest`,
    DescIcon: IconSortDescendingNumbers,
    defaultDesc: true,
  },
  followed: {
    name: msg`People you follow going`,
    asc: msg`Fewest to most`,
    AscIcon: IconSortAscendingNumbers,
    desc: msg`Most to fewest`,
    DescIcon: IconSortDescendingNumbers,
    defaultDesc: true,
  },
};

const SORT_BY = Object.keys(
  SORT_BY_OPTIONS,
) as (keyof typeof SORT_BY_OPTIONS)[];

export const LayoutOptions = qp.schema({
  sort: qp.default_(qp.literal(SORT_BY), "date"),
  desc: qp.flag,
  density: qp.default_(qp.literal(DENSITY), "comfortable"),
});
export type LayoutOptions = qp.Infer<typeof LayoutOptions>;

export default function ListView({
  events,
  layout,
  setLayout,
  filter,
  setFilter,
}: {
  events: EventWithPost[];
  layout: LayoutOptions;
  setLayout(layout: LayoutOptions): void;
  filter: FilterOptions;
  setFilter(filter: FilterOptions): void;
}) {
  const { t } = useLingui();

  const pred = useFilterPredicate(filter);
  const filteredEvents = events.filter(pred);

  const isLoggedIn = useIsLoggedIn();
  const [open, setOpen] = useState(false);

  const { data: followedEventAttendees } = useFollowedEventAttendeesDLE();

  return (
    <Box style={{ position: "relative" }}>
      <Container size="lg" px={0}>
        <FilterBar
          events={events}
          filledButton={false}
          filter={filter}
          setFilter={setFilter}
          rightSection={
            <>
              <Menu
                position="bottom-end"
                withArrow
                opened={open}
                onChange={setOpen}
              >
                <Menu.Target>
                  <Button
                    aria-label={t`Settings`}
                    variant="subtle"
                    size="xs"
                    c="dimmed"
                    color="var(--mantine-color-dimmed)"
                    style={{ zIndex: 4, flexShrink: 0 }}
                    leftSection={(() => {
                      const currentSortByDisplay = SORT_BY_OPTIONS[layout.sort];
                      return layout.desc ? (
                        <currentSortByDisplay.DescIcon
                          title={t(currentSortByDisplay.desc)}
                          size={14}
                        />
                      ) : (
                        <currentSortByDisplay.AscIcon
                          title={t(currentSortByDisplay.asc)}
                          size={14}
                        />
                      );
                    })()}
                    rightSection={<IconChevronDown size={14} />}
                  >
                    {t(SORT_BY_OPTIONS[layout.sort].name)}
                  </Button>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>
                    <Trans>Sort by</Trans>
                  </Menu.Label>
                  {SORT_BY.map((sortBy) => {
                    if (!isLoggedIn && sortBy == "followed") {
                      return null;
                    }

                    const selected = layout.sort == sortBy;

                    return (
                      <Menu.Item
                        disabled={
                          sortBy == "followed" && followedEventAttendees == null
                        }
                        aria-selected={selected}
                        onClick={() => {
                          setLayout({
                            ...layout,
                            sort: sortBy,
                            desc: SORT_BY_OPTIONS[sortBy].defaultDesc,
                          });
                        }}
                        key={sortBy}
                        leftSection={
                          sortBy != "followed" ||
                          followedEventAttendees != null ? (
                            selected ? (
                              <IconCheck size={14} />
                            ) : (
                              <EmptyIcon size={14} />
                            )
                          ) : (
                            <Loader color="dimmed" size={14} />
                          )
                        }
                      >
                        {t(SORT_BY_OPTIONS[sortBy].name)}
                      </Menu.Item>
                    );
                  })}
                  <Menu.Label>
                    <Trans>Order</Trans>
                  </Menu.Label>
                  <Menu.Item
                    aria-selected={!layout.desc}
                    onClick={() => {
                      setLayout({
                        ...layout,
                        desc: false,
                      });
                    }}
                    leftSection={
                      <Group gap={6}>
                        {!layout.desc ? (
                          <IconCheck size={14} />
                        ) : (
                          <EmptyIcon size={14} />
                        )}
                        {(() => {
                          const Icon = SORT_BY_OPTIONS[layout.sort].AscIcon;
                          return <Icon size={14} />;
                        })()}
                      </Group>
                    }
                  >
                    {t(SORT_BY_OPTIONS[layout.sort].asc)}
                  </Menu.Item>
                  <Menu.Item
                    aria-selected={layout.desc}
                    onClick={() => {
                      setLayout({
                        ...layout,
                        desc: true,
                      });
                    }}
                    leftSection={
                      <Group gap={6}>
                        {layout.desc ? (
                          <IconCheck size={14} />
                        ) : (
                          <EmptyIcon size={14} />
                        )}
                        {(() => {
                          const Icon = SORT_BY_OPTIONS[layout.sort].DescIcon;
                          return <Icon size={14} />;
                        })()}
                      </Group>
                    }
                  >
                    {t(SORT_BY_OPTIONS[layout.sort].desc)}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              <LayoutSwitcher filter={filter} layoutType="list" />
            </>
          }
        />
      </Container>

      <Suspense
        fallback={
          <Center p="lg">
            <Loader />
          </Center>
        }
      >
        {filteredEvents.length > 0 ? (
          <Container size="lg" px={0}>
            {layout.sort == "attendees" ? (
              <EventsByAttendees
                events={filteredEvents}
                sortDesc={layout.desc}
                density={layout.density}
              />
            ) : layout.sort == "followed" ? (
              <EventsByFollowed
                events={filteredEvents}
                sortDesc={layout.desc}
                density={layout.density}
              />
            ) : layout.sort == "name" ? (
              <EventsByName
                events={filteredEvents}
                sortDesc={layout.desc}
                density={layout.density}
              />
            ) : layout.sort == "date" ? (
              <EventsByDate
                events={filteredEvents}
                sortDesc={layout.desc}
                density={layout.density}
                hideEmptyGroups={filter.attending || filter.q != ""}
              />
            ) : (
              absurd(layout.sort)
            )}
          </Container>
        ) : (
          <EmptyState filter={filter} setFilter={setFilter} />
        )}
      </Suspense>
    </Box>
  );
}
