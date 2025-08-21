import { Trans, useLingui } from "@lingui/react/macro";
import {
  Box,
  Button,
  Center,
  Container,
  Indicator,
  Loader,
  Menu,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconCheck,
  IconChevronDown,
  IconRss,
  IconSettings,
} from "@tabler/icons-react";
import { getDay, isBefore, type Day } from "date-fns";
import { Suspense, useRef, useState } from "react";
import clientMetadata from "~/../public/client-metadata.json";
import Flag from "~/components/Flag";
import { useNow, type Event } from "~/hooks";
import * as qp from "~/qp";
import Calendar from "../Calendar";
import { FIRST_DAYS_OF_WEEK, useFirstDayOfWeek } from "../DatesProvider";
import EmptyIcon from "../EmptyIcon";
import EmptyState from "../EmptyState";
import FilterBar, {
  FilterOptions,
  LayoutSwitcher,
  useFilterPredicate,
} from "../FilterBar";
import { match } from "@formatjs/intl-localematcher";

export const LayoutOptions = qp.schema({
  timezone: qp.default_(qp.literal(["theirs", "yours"]), "theirs"),
});
export type LayoutOptions = qp.Infer<typeof LayoutOptions>;

export default function CalendarView({
  events,
  layout,
  setLayout,
  filter,
  setFilter,
}: {
  events: Event[];
  layout: LayoutOptions;
  setLayout(layout: LayoutOptions): void;
  filter: FilterOptions;
  setFilter(filter: FilterOptions): void;
}) {
  const pred = useFilterPredicate(filter);
  const now = useNow();
  const filteredEvents = events.filter(
    (event) => isBefore(now, event.end) && pred(event),
  );

  const { i18n, t } = useLingui();

  const [firstDayOfWeek, setFirstDayOfWeek] = useFirstDayOfWeek();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [icsOpen, setIcsOpen] = useState(false);

  const icsInputRef = useRef<HTMLInputElement | null>(null);

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
                opened={icsOpen}
                onChange={(v) => {
                  setIcsOpen(v);
                  if (v) {
                    setTimeout(() => {
                      icsInputRef.current!.select();
                    }, 1);
                  }
                }}
              >
                <Menu.Target>
                  <Button
                    aria-label={t`Subscribe`}
                    variant="subtle"
                    size="xs"
                    c="dimmed"
                    color="var(--mantine-color-dimmed)"
                    style={{ zIndex: 4, flexShrink: 0 }}
                    rightSection={<IconChevronDown size={14} />}
                  >
                    <IconRss size={14} />
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <TextInput
                    readOnly
                    ref={icsInputRef}
                    value={`${clientMetadata.client_uri}/calendar.ics`}
                    label={t`Calendar URL`}
                    m={4}
                    w={210}
                    onClick={(e) => {
                      e.currentTarget.select();
                    }}
                    onFocus={(e) => {
                      e.target.select();
                    }}
                    size="sm"
                  />
                </Menu.Dropdown>
              </Menu>
              <Menu
                position="bottom-end"
                withArrow
                opened={settingsOpen}
                onChange={setSettingsOpen}
              >
                <Menu.Target>
                  <Button
                    aria-label={t`Settings`}
                    variant="subtle"
                    size="xs"
                    c="dimmed"
                    color="var(--mantine-color-dimmed)"
                    style={{ zIndex: 4, flexShrink: 0 }}
                    rightSection={<IconChevronDown size={14} />}
                  >
                    <IconSettings size={14} />
                  </Button>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>
                    <Trans>Week starts on</Trans>
                  </Menu.Label>
                  {FIRST_DAYS_OF_WEEK.map((day) => (
                    <Menu.Item
                      key={day as Day}
                      leftSection={
                        firstDayOfWeek == day ? (
                          <IconCheck size={14} />
                        ) : (
                          <EmptyIcon size={14} />
                        )
                      }
                      onClick={() => {
                        setFirstDayOfWeek(day as Day);
                      }}
                    >
                      {i18n.date(new Date(2006, 0, (day as number) + 1), {
                        weekday: "long",
                      })}
                    </Menu.Item>
                  ))}
                  <Menu.Label>
                    <Trans>Use time zone</Trans>
                  </Menu.Label>
                  <Menu.Item
                    leftSection={
                      layout.timezone == "theirs" ? (
                        <IconCheck size={14} />
                      ) : (
                        <EmptyIcon size={14} />
                      )
                    }
                    onClick={() => {
                      setLayout({
                        ...layout,
                        timezone: "theirs",
                      });
                    }}
                  >
                    <Trans>Theirs</Trans>
                  </Menu.Item>
                  <Menu.Item
                    leftSection={
                      layout.timezone == "yours" ? (
                        <IconCheck size={14} />
                      ) : (
                        <EmptyIcon size={14} />
                      )
                    }
                    onClick={() => {
                      setLayout({
                        ...layout,
                        timezone: "yours",
                      });
                    }}
                  >
                    <Trans>Yours</Trans>
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              <LayoutSwitcher filter={filter} layoutType="calendar" />
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
            <Calendar
              inYourTimeZone={layout.timezone == "yours"}
              includeToday={!filter.going && filter.q == ""}
              events={filteredEvents.map((event) => {
                const over = !isBefore(now, event.end);
                const active =
                  !isBefore(now, event.start) && isBefore(now, event.end);
                const country = new Intl.Locale(event.locale).region;
                const locale = match(
                  [i18n.locale],
                  [event.locale, ...Object.keys(event.translations)],
                  event.locale,
                );
                return {
                  id: event.id,
                  anchor: event.id,
                  label: (
                    <>
                      <Flag
                        country={country ?? undefined}
                        me={6}
                        style={{
                          filter: over ? "grayscale(1)" : undefined,
                        }}
                      />
                      {active ? (
                        <Indicator
                          inline
                          position="middle-center"
                          processing
                          size={6}
                          color="green"
                          me={6}
                          w="6px"
                        >
                          <Text span>&nbsp;</Text>
                        </Indicator>
                      ) : null}
                      <Text span lang={locale}>
                        {event.translations[locale]?.name ?? event.name}
                      </Text>
                    </>
                  ),
                  color: !over
                    ? [
                        "red",
                        "orange",
                        "yellow",
                        "green",
                        "blue",
                        "indigo",
                        "violet",
                      ][getDay(event.start)]
                    : "gray",
                  variant:
                    event.post?.viewer?.like != null ? "filled" : "light",
                  title: event.translations[locale]?.name ?? event.name,
                  link: `/${event.id}`,
                  start: event.start,
                  end: event.end,
                };
              })}
            />
          </Container>
        ) : (
          <EmptyState filter={filter} setFilter={setFilter} />
        )}
      </Suspense>
    </Box>
  );
}
