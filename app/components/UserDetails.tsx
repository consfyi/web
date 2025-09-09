import { Plural, Trans } from "@lingui/react/macro";
import {
  Anchor,
  Box,
  Center,
  Divider,
  Flex,
  Loader,
  SimpleGrid,
  Text,
  Title,
} from "@mantine/core";
import { Suspense } from "react";
import Avatar from "~/components/Avatar";
import { Profile } from "~/endpoints";
import { useEventsWithPosts, useProfileLabels, useSelf } from "~/hooks";
import EventRow from "./EventRow";

const GRID_COLS = { base: 1, lg: 3 };

function Attending({ profile }: { profile: Profile }) {
  const self = useSelf();
  const queriedLabels = useProfileLabels(
    self == null ? profile.did : undefined,
  );

  const labels = queriedLabels ?? profile.labels ?? [];

  const selfLabelsSet =
    self != null ? new Set(self.labels!.map((label) => label.val)) : null;
  const labelsSet = new Set(labels!.map((label) => label.val));

  const events = useEventsWithPosts();
  const filteredEvents = events.filter(
    (con) => con.labelId != null && labelsSet.has(con.labelId),
  );

  const knownEvents =
    selfLabelsSet != null
      ? filteredEvents.filter(
          (con) => con.labelId != null && selfLabelsSet.has(con.labelId),
        )
      : filteredEvents;

  const unknownEvents =
    selfLabelsSet != null
      ? filteredEvents.filter(
          (con) => con.labelId == null || !selfLabelsSet.has(con.labelId),
        )
      : [];

  return (
    <Box mb="calc(var(--mantine-spacing-sm) * -1)">
      <Title order={2} size="h5" fw={500} mb="sm">
        <Trans context="events user attending">Going</Trans>{" "}
        <Text size="sm" span>
          <Trans context="convention count">{filteredEvents.length}</Trans>
        </Text>
      </Title>

      {knownEvents.length > 0 ? (
        <SimpleGrid cols={GRID_COLS} mb="sm">
          {knownEvents.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              showMonthInIcon
              showLocation="hide"
              showFollowed={false}
              showLikeButton={false}
              showYear
              density="comfortable"
              withId={false}
            />
          ))}
        </SimpleGrid>
      ) : null}
      {unknownEvents.length > 0 ? (
        <>
          <Divider
            label={
              <Plural
                value={unknownEvents.length}
                one="# con you aren’t going to"
                other="# cons you aren’t going to"
              />
            }
            labelPosition="left"
            mb="sm"
          />
          <SimpleGrid cols={GRID_COLS} mb="sm">
            {unknownEvents.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                showMonthInIcon
                showLocation="hide"
                showFollowed={false}
                showLikeButton={false}
                showYear
                density="comfortable"
                withId={false}
              />
            ))}
          </SimpleGrid>
        </>
      ) : null}
    </Box>
  );
}

export default function UserDetails({ profile }: { profile: Profile }) {
  return (
    <>
      <Box mb="sm">
        <Flex
          wrap="nowrap"
          align={{ base: "flex-start", md: "center" }}
          gap="md"
          direction={{ base: "column", md: "row" }}
        >
          <Avatar src={profile.avatar} size="xl" />
          <Box>
            <Title size="h4" fw={500}>
              {profile.displayName}
            </Title>
            <Text>
              <Anchor
                href={`https://bsky.app/profile/${profile.handle}`}
                target="_blank"
                c="dimmed"
              >
                @{profile.handle}
              </Anchor>
            </Text>
          </Box>
        </Flex>
      </Box>

      <Suspense
        fallback={
          <Box>
            <Title order={2} size="h5" fw={500} mb="sm">
              <Trans context="user attending events">Going</Trans>
            </Title>
            <Center p="lg">
              <Loader />
            </Center>
          </Box>
        }
      >
        <Attending profile={profile} />
      </Suspense>
    </>
  );
}
