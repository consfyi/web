import { Trans, useLingui } from "@lingui/react/macro";
import {
  Box,
  Button,
  Center,
  Container,
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
import { type Day, getDay } from "date-fns";
import { Suspense, useEffect, useRef, useState } from "react";
import clientMetadata from "~/../public/client-metadata.json";
import Flag from "~/components/Flag";
import { type EventWithPost } from "~/hooks";
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
  events: EventWithPost[];
  layout: LayoutOptions;
  setLayout(layout: LayoutOptions): void;
  filter: FilterOptions;
  setFilter(filter: FilterOptions): void;
}) {
  const pred = useFilterPredicate(filter);
  const filteredEvents = events.filter(pred);

  const { i18n, t } = useLingui();

  const [firstDayOfWeek, setFirstDayOfWeek] = useFirstDayOfWeek();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [icsOpen, setIcsOpen] = useState(false);

  const icsInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (icsOpen) {
      setTimeout(() => {
        icsInputRef.current!.focus();
      }, 1);
    }
  }, [icsOpen]);

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
                onChange={setIcsOpen}
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
              includeToday={!filter.attending && filter.q == ""}
              events={filteredEvents.map((con) => ({
                id: con.id,
                anchor: con.id,
                label: (
                  <>
                    <Flag country={con.country ?? undefined} size={8} me={4} />
                    <Text span>{con.name}</Text>
                  </>
                ),
                color: [
                  "red",
                  "orange",
                  "yellow",
                  "green",
                  "blue",
                  "indigo",
                  "violet",
                ][getDay(con.start)],
                variant:
                  con.post.viewer != null && con.post.viewer.like != null
                    ? "filled"
                    : "light",
                title: con.name,
                link: `/${con.id}`,
                start: con.start,
                end: con.end,
              }))}
            />
          </Container>
        ) : (
          <EmptyState filter={filter} setFilter={setFilter} />
        )}
      </Suspense>
    </Box>
  );
}
