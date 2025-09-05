import { match } from "@formatjs/intl-localematcher";
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
import type { DayOfWeek } from "@mantine/dates";
import {
  IconCheck,
  IconChevronDown,
  IconRss,
  IconSettings,
} from "@tabler/icons-react";
import { Suspense, useMemo, useRef, useState } from "react";
import { Temporal } from "temporal-polyfill";
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
import { getExtendedRequestedLocales } from "../LinguiProvider";

export const LayoutOptions = qp.schema({
  inYourTimeZone: qp.flag,
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

  const filteredEvents = useMemo(
    () => events.filter((event) => pred(event)),
    [events, pred],
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
                      key={day as DayOfWeek}
                      leftSection={
                        firstDayOfWeek == day ? (
                          <IconCheck size={14} />
                        ) : (
                          <EmptyIcon size={14} />
                        )
                      }
                      onClick={() => {
                        setFirstDayOfWeek(day as DayOfWeek);
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
                      !layout.inYourTimeZone ? (
                        <IconCheck size={14} />
                      ) : (
                        <EmptyIcon size={14} />
                      )
                    }
                    onClick={() => {
                      setLayout({
                        ...layout,
                        inYourTimeZone: false,
                      });
                    }}
                  >
                    <Trans>Theirs</Trans>
                  </Menu.Item>
                  <Menu.Item
                    leftSection={
                      layout.inYourTimeZone ? (
                        <IconCheck size={14} />
                      ) : (
                        <EmptyIcon size={14} />
                      )
                    }
                    onClick={() => {
                      setLayout({
                        ...layout,
                        inYourTimeZone: true,
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
              includeToday={!filter.going && filter.q == ""}
              events={filteredEvents.map((event) => {
                const over =
                  Temporal.ZonedDateTime.compare(now, event.endTime) > 0;
                const active =
                  Temporal.ZonedDateTime.compare(now, event.startTime) > 0 &&
                  !over;

                const country = new Intl.Locale(event.locale).region;
                const locale = match(
                  getExtendedRequestedLocales(i18n.locale),
                  [...Object.keys(event.translations), event.locale],
                  event.locale,
                );

                let startDate = event.startDate;
                let endDate = event.endDate;

                if (layout.inYourTimeZone) {
                  startDate = event.startTime
                    .withTimeZone(Temporal.Now.timeZoneId())
                    .toPlainDateTime()
                    .toPlainDate();
                  endDate = event.endTime
                    .subtract({ hours: 12 })
                    .withTimeZone(Temporal.Now.timeZoneId())
                    .toPlainDateTime()
                    .toPlainDate();
                }

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
                      ][event.startDate.dayOfWeek % 7]
                    : "gray",
                  variant:
                    event.post?.viewer?.like != null ? "filled" : "light",
                  title: event.translations[locale]?.name ?? event.name,
                  link: `/${event.id}`,
                  startDate,
                  endDate,
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
