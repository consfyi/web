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
import { comparing, map, Range, sorted, toArray } from "iter-fns";
import { Fragment, Suspense, useMemo } from "react";
import { Link } from "react-router";
import { Temporal, Intl as TemporalIntl } from "temporal-polyfill";
import attributions from "~/attributions";
import Avatar from "~/components/Avatar";
import Flag from "~/components/Flag";
import LikeButton from "~/components/LikeButton";
import SimpleErrorBoundary from "~/components/SimpleErrorBoundary";
import { LABELER_DID } from "~/config";
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

const KEY_DATE_CATEGORIES = [
  "registration",
  "hotel",
  "dealers",
  "panels",
  "volunteers",
] as const;

// Freshness as a relative duration ("3 days ago", "10 hours ago") so it doesn't
// read like a second calendar date next to the key date itself.
function formatAsOf(iso: string, nowMs: number, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffSec = Math.round((new Date(iso).getTime() - nowMs) / 1000);
  const abs = Math.abs(diffSec);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (abs >= secs) {
      return rtf.format(Math.round(diffSec / secs), unit);
    }
  }
  return rtf.format(0, "minute");
}

function KeyDatesSection({ event }: { event: Event }) {
  const { i18n, t } = useLingui();

  const fmt = useMemo(
    () =>
      new TemporalIntl.DateTimeFormat(i18n.locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [i18n.locale],
  );

  // source-post timestamp shown with time + timezone, so freshness is unambiguous
  const asOfFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }),
    [i18n.locale],
  );

  const labels: Record<(typeof KEY_DATE_CATEGORIES)[number], string> = {
    registration: t`Registration`,
    hotel: t`Hotel`,
    dealers: t`Dealers`,
    panels: t`Programming`,
    volunteers: t`Volunteers`,
  };

  const now = useNow();
  const nowMs = now.epochMilliseconds;
  const todayStr = now.toPlainDate().toString();

  const kd = event.keyDates;
  // Once the event itself is over, drop passed dates so historical pages stay
  // clean; during the lead-up and the con, keep them for context.
  const eventOver = event.endDate.toString() < todayStr;
  const rows = useMemo(() => {
    if (kd == null) {
      return [];
    }
    return KEY_DATE_CATEGORIES.flatMap((cat) => {
      const entry = kd[cat];
      if (entry == null) {
        return [];
      }
      const kinds = (["opens", "closes"] as const).flatMap((kind) => {
        const k = entry[kind];
        if (k == null) {
          return [];
        }
        const passed = k.date < todayStr;
        if (passed && eventOver) {
          return [];
        }
        const label = passed
          ? kind === "opens"
            ? t`Opened`
            : t`Closed`
          : kind === "opens"
            ? t`Opens`
            : t`Closes`;
        return [
          {
            kind,
            passed,
            text: `${label} ${fmt.format(Temporal.PlainDate.from(k.date))}`,
            source: k.source,
            asOfRel:
              k.asOf != null ? formatAsOf(k.asOf, nowMs, i18n.locale) : null,
            asOfExact: k.asOf != null ? asOfFmt.format(new Date(k.asOf)) : null,
          },
        ];
      });
      return kinds.length > 0 ? [{ cat, kinds }] : [];
    });
  }, [kd, eventOver, fmt, asOfFmt, nowMs, todayStr, i18n.locale, t]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <Box mt="sm">
      <MantineTitle order={2} size="h5" fw={500} mb="xs">
        <Trans>Key dates</Trans>
      </MantineTitle>
      <Stack gap={8}>
        {rows.map((row) => (
          <Group key={row.cat} wrap="nowrap" gap="xs" align="top">
            <Text size="sm" fw={500} miw={92}>
              {labels[row.cat]}
            </Text>
            <Stack gap={2} miw={0}>
              {row.kinds.map((k) => (
                <Text key={k.kind} size="sm" c={k.passed ? "dimmed" : undefined}>
                  {k.text}
                  {k.source != null ? (
                    <>
                      {" "}
                      <Tooltip label={<Trans>Source post</Trans>}>
                        <Anchor href={k.source} target="_blank">
                          <IconBrandBluesky
                            size={13}
                            stroke={1.5}
                            style={{ verticalAlign: "-1px" }}
                          />
                        </Anchor>
                      </Tooltip>
                    </>
                  ) : null}
                  {k.asOfRel != null ? (
                    <Tooltip label={k.asOfExact}>
                      <Text
                        span
                        size="xs"
                        c="dimmed"
                        style={{ cursor: "default" }}
                      >
                        {" · "}
                        {t`as of`} {k.asOfRel}
                      </Text>
                    </Tooltip>
                  ) : null}
                </Text>
              ))}
            </Stack>
          </Group>
        ))}
      </Stack>
      <Text size="xs" c="dimmed" mt={6}>
        <Trans>
          Dates are pulled from the convention’s Bluesky. Always confirm on the{" "}
          <Anchor href={event.url} target="_blank">
            official site
          </Anchor>
          .
        </Trans>
      </Text>
    </Box>
  );
}

export function Body({ event }: { event: Event }) {
  const { i18n, t } = useLingui();

  const dateTimeFormat = useMemo(() => {
    void t;
    return new TemporalIntl.DateTimeFormat(i18n.locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [t, i18n.locale]);

  const now = useNow();
  const over = Temporal.ZonedDateTime.compare(now, event.endTime) > 0;
  const active =
    Temporal.ZonedDateTime.compare(now, event.startTime) > 0 && !over;

  const languageDisplayNames = useMemo(() => {
    void t;
    return new Intl.DisplayNames(i18n.locale, {
      type: "language",
      languageDisplay: "standard",
    });
  }, [t, i18n.locale]);

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
              <Anchor
                component={Link}
                to={`/calendar#${event.id}`}
                c="var(--mantine-color-text)"
              >
                <Trans context="[start date]-[end date] ([duration] days)">
                  {dateTimeFormat.formatRange(event.startDate, event.endDate)} (
                  {event.endDate
                    .since(event.startDate)
                    .add({ days: 1 })
                    .toLocaleString(i18n.locale, { day: "numeric" })}
                  )
                </Trans>
              </Anchor>
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

          {event.bluesky != null ? (
            <Group wrap="nowrap" gap="xs" align="top">
              <Box>
                <IconBrandBluesky title={t`Bluesky`} size={16} stroke={1.5} />
              </Box>
              <Text size="sm" mb={5}>
                <Anchor
                  href={`https://bsky.app/profile/${event.bluesky.did}`}
                  target="_blank"
                  style={{ wordBreak: "break-all" }}
                >
                  @{event.bluesky.handle ?? event.bluesky.did}
                </Anchor>
              </Text>
            </Group>
          ) : null}

          <Group wrap="nowrap" gap="xs" align="top">
            <Box>
              <IconMapPin title={t`Location`} size={16} stroke={1.5} />
            </Box>
            <Text size="sm" mb={5}>
              {event.address != null ? (
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
              ) : (
                <span lang={locale}>
                  {event.translations[locale]?.venue || event.venue}
                </span>
              )}
            </Text>
          </Group>

          <Group wrap="nowrap" gap="xs" align="top">
            <Box>
              <IconLanguage title={t`Language`} size={16} stroke={1.5} />
            </Box>
            <Text size="sm" mb={5}>
              {languageDisplayNames.of(event.locale)}
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
            {event.bluesky == null ? (
              <Text size="xs" mt={4}>
                <Trans>
                  Know this convention’s Bluesky account?{" "}
                  <Anchor
                    href={`https://github.com/consfyi/data/issues/new?template=add-bluesky.yml&title=${encodeURIComponent(`Add Bluesky account: ${event.name}`)}&name=${encodeURIComponent(event.name)}`}
                    target="_blank"
                  >
                    Let us know.
                  </Anchor>
                </Trans>
              </Text>
            ) : null}
          </Box>
        </Box>
      </Box>

      <KeyDatesSection event={event} />

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
