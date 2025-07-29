import { Plural, Trans, useLingui } from "@lingui/react/macro";
import {
  Anchor,
  Box,
  Divider,
  Group,
  Indicator,
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
  IconCalendarWeek,
  IconMapPin,
  IconWorld,
} from "@tabler/icons-react";
import { differenceInDays, isAfter, subDays } from "date-fns";
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
  type EventWithPost,
  useFollowedEventAttendeesDLE,
  useLikes,
  useNow,
  useSelf,
  useSelfFollowsDLE,
} from "~/hooks";
import IntlList from "./IntlList";

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
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} mb="sm">
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
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} mb="sm">
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

export function Title({ event }: { event: EventWithPost }) {
  const { t } = useLingui();

  return (
    <Group gap={7} wrap="nowrap" align="top">
      {event.post.viewer != null ? (
        <Box mt={2} mb={-2}>
          <LikeButton size="sm" iconSize={24} post={event.post} />
        </Box>
      ) : null}
      <MantineTitle size="h4" fw={500}>
        <Flag country={event.country ?? undefined} size={14} me={6} />{" "}
        {event.name}{" "}
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
        </Tooltip>
      </MantineTitle>
    </Group>
  );
}

export function Body({ event }: { event: EventWithPost }) {
  const { i18n, t } = useLingui();

  const dateTimeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  const now = useNow();
  const active = isAfter(now, event.start) && !isAfter(now, event.end);

  const {
    data: followedEventAttendees,
    loading: followedEventAttendeesLoading,
  } = useFollowedEventAttendeesDLE();

  const self = useSelf();

  const isAttending = event.post.viewer?.like != null;

  const likeCount = event.post.likeCount ?? 0;

  const knownLikeCount =
    self != null
      ? (followedEventAttendees != null &&
        followedEventAttendees[event.id] != null
          ? followedEventAttendees[event.id].length
          : 0) + (isAttending ? 1 : 0)
      : likeCount;

  const unknownLikeCount = likeCount - knownLikeCount;

  return (
    <>
      <Box mb="sm">
        <Box mt={4}>
          <Group wrap="nowrap" gap="xs" align="top">
            <Box>
              <Indicator
                position="top-start"
                color="green"
                processing
                size={12}
                withBorder
                disabled={!active}
                zIndex={2}
              >
                <IconCalendarWeek title={t`Dates`} size={16} stroke={1.5} />
              </Indicator>
            </Box>
            <Text size="sm" mb={5}>
              <Trans context="[start date]-[end date] ([duration] days)">
                {dateTimeFormat.formatRange(
                  reinterpretAsLocalDate(event.start),
                  reinterpretAsLocalDate(subDays(event.end, 1)),
                )}{" "}
                (
                <Plural
                  value={differenceInDays(event.end, event.start)}
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
                {event.location}
              </Anchor>{" "}
            </Text>
          </Group>

          <Box mt={4}>
            <Text size="xs">
              <Trans>
                Is this information incorrect?{" "}
                <Anchor
                  href="https://github.com/consfyi/data/issues/new?template=missing-or-incorrect-convention.md"
                  target="_blank"
                >
                  File an issue here.
                </Anchor>{" "}
                {event.sources != null && event.sources.length > 0 ? (
                  <Trans>
                    This information was originally sourced from{" "}
                    <IntlList
                      items={event.sources.map((source) => {
                        const attribution = attributions[source];
                        return attribution != undefined ? (
                          <Anchor
                            href={attribution.url}
                            target="_blank"
                            key={source}
                          >
                            {attribution.name}
                          </Anchor>
                        ) : (
                          <Fragment key={source}>source</Fragment>
                        );
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

      <Box mb="calc(var(--mantine-spacing-sm) * -1)">
        <MantineTitle order={2} size="h5" fw={500} mb="sm">
          <Trans>Going</Trans>{" "}
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
                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} mb="sm">
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
                      <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} mb="sm">
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
    </>
  );
}

export default function EventDetails({ event }: { event: EventWithPost }) {
  return (
    <>
      <Title event={event} />
      <Body event={event} />
    </>
  );
}
