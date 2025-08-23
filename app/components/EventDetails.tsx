import { match } from "@formatjs/intl-localematcher";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import {
  Alert,
  Anchor,
  Box,
  Divider,
  Group,
  Loader,
  Title as MantineTitle,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconBrandBluesky,
  IconCalendarCheck,
  IconCalendarClock,
  IconCalendarWeek,
  IconCalendarX,
  IconLanguage,
  IconMapPin,
  IconWorld,
} from "@tabler/icons-react";
import { differenceInDays, isBefore } from "date-fns";
import { comparing, map, Range, sorted, toArray } from "iter-fns";
import { Fragment, Suspense, useMemo } from "react";
import { Link } from "react-router";
import attributions from "~/attributions";
import Avatar from "~/components/Avatar";
import Flag from "~/components/Flag";
import LikeButton from "~/components/LikeButton";
import SimpleErrorBoundary from "~/components/SimpleErrorBoundary";
import { LABELER_DID } from "~/config";
import { reinterpretAsLocalDate } from "~/date";
import { Profile } from "~/endpoints";
import {
  type Event,
  useFollowedEventAttendeesDLE,
  useLikes,
  useNow,
  useSelf,
  useSelfFollowsDLE,
} from "~/hooks";
import GuessedEventMarker from "./GuessedEventMarker";
import IntlList from "./IntlList";
import { getExtendedRequestedLocales } from "./LinguiProvider";

function ActorSkeleton() {
  return (
    <Group wrap="nowrap" gap="sm">
      <Skeleton circle height={38} />

      <Stack gap={8} miw={0} flex="1 0">
        <Skeleton height={14} width="80%" />
        <Skeleton height={12} width="70%" />
      </Stack>
    </Group>
  );
}

const GRID_COLS = { base: 1, xs: 2, sm: 3, md: 4, lg: 5 };

function Actor({ actor }: { actor: Profile }) {
  return (
    <Anchor
      component={Link}
      to={`/@${actor.handle}`}
      c="var(--mantine-color-text)"
      style={{
        textDecoration: "unset",
      }}
    >
      <Group wrap="nowrap" gap="sm">
        <Avatar src={actor.avatar} alt={`@${actor.handle}`} />
        <Stack gap={0} miw={0}>
          <Text size="sm" fw={500} truncate>
            {actor.displayName ? actor.displayName : actor.handle}{" "}
          </Text>
          <Text size="xs" truncate>
            @{actor.handle}
          </Text>
        </Stack>
      </Group>
    </Anchor>
  );
}

function AttendeesList({
  isSelfAttending,
  event,
}: {
  isSelfAttending: boolean;
  event: Event;
}) {
  const self = useSelf();
  const { data: selfFollows } = useSelfFollowsDLE();

  const likes = useLikes(
    `at://${LABELER_DID}/app.bsky.feed.post/${event.postRkey}`,
  );

  const [knownLikes, unknownLikes] = useMemo(() => {
    let knownLikes: Profile[] = [];
    let unknownLikes: Profile[] = [];

    for (const like of likes) {
      if (self != null && like.actor!.did == self.did) {
        continue;
      }
      const out =
        selfFollows == null || selfFollows.has(like.actor!.did!)
          ? knownLikes
          : unknownLikes;
      out.push(like.actor!);
    }

    knownLikes = sorted(
      knownLikes,
      comparing((actor) => actor.handle),
    );
    unknownLikes = sorted(
      unknownLikes,
      comparing((actor) => actor.handle),
    );

    if (isSelfAttending && self != null) {
      knownLikes.unshift(self);
    }

    return [knownLikes, unknownLikes];
  }, [isSelfAttending, self, selfFollows, likes]);

  return likes!.length > 0 ? (
    <>
      {knownLikes.length > 0 ? (
        <SimpleGrid cols={GRID_COLS} mb="sm">
          {knownLikes.map((actor) => (
            <Actor actor={actor} key={actor.did} />
          ))}
        </SimpleGrid>
      ) : null}
      {unknownLikes.length > 0 ? (
        <>
          <Divider
            label={
              <Plural
                value={unknownLikes.length}
                one="# person you don’t follow"
                other="# people you don’t follow"
              />
            }
            labelPosition="left"
            mb="sm"
          />
          <SimpleGrid cols={GRID_COLS} mb="sm">
            {unknownLikes.map((actor) => (
              <Actor actor={actor} key={actor.did} />
            ))}
          </SimpleGrid>
        </>
      ) : null}
    </>
  ) : (
    <Box mb="sm">
      <Text c="dimmed" size="sm" h={38} pt={4}>
        <Trans>Nobody known to be going yet.</Trans>
      </Text>
    </Box>
  );
}

export function Title({ event }: { event: Event }) {
  const { i18n, t } = useLingui();

  const guessed = useMemo(
    () =>
      event.sources != null
        ? event.sources.some((source) => source == "guessed")
        : false,
    [event],
  );

  const country = useMemo(
    () => new Intl.Locale(event.locale).region,
    [event.locale],
  );

  const locale = match(
    getExtendedRequestedLocales(i18n.locale),
    [...Object.keys(event.translations), event.locale],
    event.locale,
  );

  return (
    <Group gap={7} wrap="nowrap" align="top">
      {event.post?.viewer != null ? (
        <Box mt={2} mb={-2}>
          <LikeButton size="sm" iconSize={20} post={event.post} />
        </Box>
      ) : null}
      <MantineTitle size="h4" fw={500}>
        <Flag country={country} me={6} />
        <span lang={locale}>
          {event.translations[locale]?.name ?? event.name}
        </span>{" "}
        <Tooltip label={<Trans>View Bluesky Post</Trans>}>
          <Anchor
            href={`https://bsky.app/profile/${LABELER_DID}/post/${event.postRkey}`}
            target="_blank"
          >
            <IconBrandBluesky
              title={t`View Bluesky Post`}
              size={16}
              stroke={1.5}
            />
          </Anchor>
        </Tooltip>{" "}
        {guessed ? <GuessedEventMarker /> : null}
      </MantineTitle>
    </Group>
  );
}

export function Body({ event }: { event: Event }) {
  const { i18n, t } = useLingui();

  const dateTimeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [t],
  );

  const now = useNow();
  const active = !isBefore(now, event.start) && isBefore(now, event.end);

  const language = useMemo(
    () =>
      new Intl.DisplayNames(i18n.locale, { type: "language" }).of(event.locale),
    [t],
  );

  const {
    data: followedEventAttendees,
    loading: followedEventAttendeesLoading,
  } = useFollowedEventAttendeesDLE();

  const self = useSelf();

  const isAttending = event.post?.viewer?.like != null;
  const likeCount = event.post != null ? (event.post.likeCount ?? 0) : 0;

  const knownLikeCount =
    self != null
      ? (followedEventAttendees != null &&
        followedEventAttendees[event.id] != null
          ? followedEventAttendees[event.id].length
          : 0) + (isAttending ? 1 : 0)
      : likeCount;

  const unknownLikeCount = likeCount - knownLikeCount;

  const over = !isBefore(now, event.end);

  const sources = useMemo(
    () =>
      event.sources != null ? event.sources.filter((s) => s != "guessed") : [],
    [event.sources],
  );

  const locale = match(
    getExtendedRequestedLocales(i18n.locale),
    [...Object.keys(event.translations), event.locale],
    event.locale,
  );

  return (
    <>
      <Box mb="sm">
        <Box mt={4}>
          <Group wrap="nowrap" gap="xs" align="top">
            <Box>
              <IconCalendarWeek title={t`Dates`} size={16} stroke={1.5} />
            </Box>
            <Text size="sm" mb={5}>
              <Trans context="[start date]-[end date] ([duration] days)">
                {dateTimeFormat.formatRange(
                  reinterpretAsLocalDate(event.start),
                  reinterpretAsLocalDate(event.end),
                )}{" "}
                (
                <Plural
                  value={differenceInDays(event.end, event.start) + 1}
                  one="# day"
                  other="# days"
                />
                )
              </Trans>
            </Text>
          </Group>

          <Group wrap="nowrap" gap="xs" align="top">
            <Box>
              <IconWorld title={t`Website`} size={16} stroke={1.5} />
            </Box>
            <Text size="sm" mb={5}>
              <Anchor
                href={event.url}
                target="_blank"
                style={{ wordBreak: "break-all" }}
              >
                {event.url.replace(/https:\/\//, "")}
              </Anchor>
            </Text>
          </Group>

          <Group wrap="nowrap" gap="xs" align="top">
            <Box>
              <IconMapPin title={t`Location`} size={16} stroke={1.5} />
            </Box>
            <Text size="sm" mb={5}>
              <Anchor
                component={Link}
                to={`/map#${event.id}`}
                c="var(--mantine-color-text)"
              >
                <span lang={locale}>
                  {event.translations[locale]?.venue || event.venue}
                </span>{" "}
                <Text span size="xs" lang={locale}>
                  {event.translations[locale]?.address || event.address}
                </Text>
              </Anchor>
            </Text>
          </Group>

          <Group wrap="nowrap" gap="xs" align="top">
            <Box>
              <IconLanguage title={t`Language`} size={16} stroke={1.5} />
            </Box>
            <Text size="sm" mb={5}>
              {language}
            </Text>
          </Group>

          <Box mt={4}>
            <Text size="xs">
              <Trans>
                Does this information need to be edited or delisted?{" "}
                <Anchor
                  href={`https://github.com/consfyi/data/issues/new?template=edit-convention.yml&title=${encodeURIComponent(`Edit convention: ${event.name}`)}&name=${encodeURIComponent(event.name)}`}
                  target="_blank"
                >
                  File an issue here.
                </Anchor>{" "}
                {sources.length > 0 ? (
                  <Trans>
                    This information was originally sourced from{" "}
                    <IntlList
                      items={sources.flatMap((source) => {
                        const attribution = attributions[source];
                        return attribution != undefined
                          ? [
                              <Anchor
                                href={attribution.url}
                                target="_blank"
                                key={source}
                              >
                                {attribution.name}
                              </Anchor>,
                            ]
                          : [<Fragment key={source}>source</Fragment>];
                      })}
                    />
                    . Usage restrictions may apply.
                  </Trans>
                ) : null}
              </Trans>
            </Text>
          </Box>
        </Box>
      </Box>

      {event.canceled ? (
        <Alert color="red" icon={<IconCalendarX />}>
          <Trans>This convention was canceled.</Trans>
        </Alert>
      ) : active ? (
        <Alert color="green" icon={<IconCalendarClock />}>
          <Trans>This convention is currently in progress.</Trans>
        </Alert>
      ) : over ? (
        <Alert icon={<IconCalendarCheck />}>
          {event.post != null ? (
            <Trans>This convention has already ended.</Trans>
          ) : (
            <Trans>
              This convention has already ended. Information on who is going is
              no longer available.
            </Trans>
          )}
        </Alert>
      ) : null}

      {event.post != null ? (
        <Box mt="sm" mb="calc(var(--mantine-spacing-sm) * -1)">
          <MantineTitle order={2} size="h5" fw={500} mb="sm">
            <Trans context="users attending event">Going</Trans>{" "}
            <Text size="sm" span>
              {isAttending ? (
                <Trans context="attendee count, including you">
                  {[likeCount][0]} including you
                </Trans>
              ) : (
                <Trans context="attendee count">{[likeCount][0]}</Trans>
              )}{" "}
            </Text>
          </MantineTitle>
          <Box>
            <SimpleErrorBoundary>
              {followedEventAttendeesLoading ? (
                <Group wrap="nowrap" gap={7} mb="sm">
                  <Loader size={8} color="dimmed" type="bars" />
                  <Text c="dimmed" size="xs" lh="md">
                    <Trans>Loading people you follow</Trans>
                  </Text>
                </Group>
              ) : null}
              <Suspense
                fallback={
                  <>
                    {knownLikeCount > 0 || unknownLikeCount == 0 ? (
                      <SimpleGrid cols={GRID_COLS} mb="sm">
                        {toArray(
                          map(
                            Range.to(knownLikeCount > 0 ? knownLikeCount : 1),
                            (i) => <ActorSkeleton key={i} />,
                          ),
                        )}
                      </SimpleGrid>
                    ) : null}
                    {unknownLikeCount > 0 ? (
                      <>
                        <Divider
                          label={
                            <Plural
                              value={[unknownLikeCount][0]}
                              one="# person you don’t follow"
                              other="# people you don’t follow"
                            />
                          }
                          labelPosition="left"
                          mb="sm"
                        />
                        <SimpleGrid cols={GRID_COLS} mb="sm">
                          {toArray(
                            map(Range.to(unknownLikeCount), (i) => (
                              <ActorSkeleton key={i} />
                            )),
                          )}
                        </SimpleGrid>
                      </>
                    ) : null}
                  </>
                }
              >
                <AttendeesList event={event} isSelfAttending={isAttending} />
              </Suspense>
            </SimpleErrorBoundary>
          </Box>
        </Box>
      ) : null}
    </>
  );
}

export default function EventDetails({ event }: { event: Event }) {
  return (
    <>
      <Title event={event} />
      <Body event={event} />
    </>
  );
}
