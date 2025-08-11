import { plural } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import {
  Anchor,
  Box,
  Group,
  Indicator,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconCalendarWeek,
  IconMapPin,
  IconUsers,
  IconWorld,
} from "@tabler/icons-react";
import { differenceInDays, getDay, isBefore } from "date-fns";
import { sample } from "iter-fns";
import { useMemo } from "react";
import { Link } from "react-router";
import Avatar from "~/components/Avatar";
import Flag from "~/components/Flag";
import LikeButton from "~/components/LikeButton";
import { reinterpretAsLocalDate } from "~/date";
import {
  type Event,
  eventHasPost,
  useFollowedEventAttendeesDLE,
  useNow,
} from "~/hooks";
import classes from "./EventRow.module.css";
import GuessedEventMarker from "./GuessedEventMarker";

const MAX_AVATARS_IN_STACK = 3;

export default function EventRow({
  event,
  showMonthInIcon,
  showLocation,
  showFollowed,
  showLikeButton,
  showYear,
  density,
  withId,
}: {
  event: Event;
  showMonthInIcon: boolean;
  showLocation: "inline" | "break" | "hide";
  showFollowed: boolean;
  showLikeButton: boolean;
  showYear: boolean;
  density: "comfortable" | "cozy" | "compact";
  withId: boolean;
}) {
  const isAttending = eventHasPost(event) && event.post.viewer?.like != null;
  const { data: followedEventAttendees } = useFollowedEventAttendeesDLE();

  const likeCountWithoutSelf =
    (eventHasPost(event) ? event.post.likeCount || 0 : 0) -
    (isAttending ? 1 : 0);

  const likeCount = likeCountWithoutSelf + (isAttending ? 1 : 0);

  const { i18n, t } = useLingui();

  const dateTimeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: showYear ? "numeric" : undefined,
      }),
    [t],
  );

  const listFormat = useMemo(
    () =>
      new Intl.ListFormat(i18n.locale, {
        type: "conjunction",
        style: "long",
      }),
    [t],
  );

  const follows = useMemo(
    () =>
      followedEventAttendees != null
        ? (followedEventAttendees[event.id] ?? [])
        : null,
    [followedEventAttendees, event.id],
  );

  const now = useNow();
  const sampledFollows = useMemo(() => {
    let seed = +now;
    return follows != null
      ? sample(follows, MAX_AVATARS_IN_STACK, () => {
          seed = (seed * 25214903917 + 11) % 2 ** 48;
          return seed / 2 ** 48;
        })
      : null;
  }, [follows, now]);

  const over = !isBefore(now, event.end);
  const active = !isBefore(now, event.start) && !over;

  const guessed = useMemo(
    () =>
      event.sources != null
        ? event.sources.some((source) => source == "guessed")
        : false,
    [event],
  );

  return (
    <Group gap="xs" wrap="nowrap" id={withId ? event.id : undefined}>
      {density == "comfortable" ? (
        <Anchor component={Link} to={`/${event.id}`}>
          <Indicator
            position="top-start"
            color="green"
            processing={active}
            size={12}
            withBorder
            disabled={!active}
            zIndex={2}
          >
            <ThemeIcon
              size="xl"
              variant="light"
              color={
                [
                  "red",
                  "orange",
                  "yellow",
                  "green",
                  "blue",
                  "indigo",
                  "violet",
                ][getDay(reinterpretAsLocalDate(event.start))]
              }
            >
              <Stack gap={0}>
                <Text size="md" ta="center" fw={500}>
                  {i18n.date(reinterpretAsLocalDate(event.start), {
                    day: "numeric",
                  })}
                </Text>
                <Text size="xs" ta="center" fw={500}>
                  {i18n.date(
                    reinterpretAsLocalDate(event.start),
                    showMonthInIcon
                      ? {
                          month: "short",
                        }
                      : {
                          weekday: "short",
                        },
                  )}
                </Text>
              </Stack>
            </ThemeIcon>
          </Indicator>
        </Anchor>
      ) : null}
      <Box
        style={{
          minWidth: 0,
          display: density == "compact" ? "flex" : "block",
          alignItems: "end",
        }}
        className={density == "compact" ? classes.compact : ""}
      >
        <Group gap={7} wrap="nowrap">
          {showLikeButton &&
          eventHasPost(event) &&
          event.post.viewer != null ? (
            <LikeButton size="xs" post={event.post} />
          ) : null}

          <Text size="sm" truncate>
            <Anchor component={Link} to={`/${event.id}`}>
              <Flag country={event.country ?? undefined} size={10} me={6} />
              {active && density == "compact" ? (
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
              <Text span fw={500}>
                {event.name}
              </Text>
            </Anchor>{" "}
            {guessed ? <GuessedEventMarker /> : null}{" "}
            <Tooltip label={event.url.replace(/https:\/\//, "")}>
              <Anchor
                href={event.url}
                target="_blank"
                opacity={0.4}
                title={t`Website`}
              >
                <IconWorld size={12} />
              </Anchor>
            </Tooltip>
          </Text>
        </Group>
        <Text size="sm" truncate className={classes.itemDetails}>
          {eventHasPost(event) ? (
            <Text span>
              <IconUsers
                title={t({
                  message: "People going",
                  context: "number of people going",
                })}
                size={12}
              />{" "}
              <Trans context="attendee count">{[likeCount][0]}</Trans>
              {showFollowed && follows != null && follows.length > 0 ? (
                <>
                  {" "}
                  <Tooltip
                    label={listFormat.format(
                      sampledFollows!
                        .map(
                          (follow) => follow.displayName ?? follow.handle ?? "",
                        )
                        .concat(
                          follows.length > MAX_AVATARS_IN_STACK
                            ? [
                                plural(follows.length - MAX_AVATARS_IN_STACK, {
                                  one: "# other you follow",
                                  other: "# others you follow",
                                }),
                              ]
                            : [],
                        ),
                    )}
                  >
                    <Avatar.Group
                      display="inline-flex"
                      spacing="xs"
                      my={-1}
                      style={{
                        verticalAlign: "bottom",
                      }}
                    >
                      {sampledFollows!.map((follow) => (
                        <Avatar
                          key={follow.did}
                          src={follow.avatar}
                          alt={`@${follow.handle}`}
                          size={22}
                        />
                      ))}
                      {follows.length > MAX_AVATARS_IN_STACK ? (
                        <Avatar size={22}>
                          +{follows.length - MAX_AVATARS_IN_STACK}
                        </Avatar>
                      ) : null}
                    </Avatar.Group>
                  </Tooltip>
                </>
              ) : null}
            </Text>
          ) : null}
          <Text span>
            <IconCalendarWeek title={t`Dates`} size={12} />{" "}
            <Trans context="[start date]-[end date] ([duration] days)">
              {
                [
                  dateTimeFormat.formatRange(
                    reinterpretAsLocalDate(event.start),
                    reinterpretAsLocalDate(event.end),
                  ),
                ][0]
              }{" "}
              (
              <Plural
                value={differenceInDays(event.end, event.start) + 1}
                one="# day"
                other="# days"
              />
              )
            </Trans>
          </Text>
          {showLocation == "inline" ? (
            <Text span visibleFrom="xs">
              <IconMapPin title={t`Location`} size={12} />{" "}
              <Anchor
                component={Link}
                to={`/map#${event.id}`}
                c="var(--mantine-color-text)"
              >
                {event.venue}{" "}
                <Text span size="xs">
                  {event.address}
                </Text>
              </Anchor>
            </Text>
          ) : null}
        </Text>
        {showLocation == "break" ? (
          <Text size="sm" truncate>
            <Text span>
              <IconMapPin title={t`Location`} size={12} /> {event.venue}
            </Text>
          </Text>
        ) : null}
      </Box>
    </Group>
  );
}

export function EventRowSkeleton() {
  return (
    <Group gap="xs" wrap="nowrap">
      <Skeleton
        height="calc(2.75rem * var(--mantine-scale))"
        width="calc(2.75rem * var(--mantine-scale))"
      />
      <Box flex="1 0">
        <Skeleton height="var(--mantine-font-size-md)" width="25%" mb={4} />
        <Skeleton height="var(--mantine-font-size-md)" width="60%" />
      </Box>
    </Group>
  );
}
