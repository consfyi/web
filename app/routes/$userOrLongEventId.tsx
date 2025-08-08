import type { ActorIdentifier } from "@atcute/lexicons";
import { Container } from "@mantine/core";
import EventDetails from "~/components/EventDetails";
import UserDetails from "~/components/UserDetails";
import { useEventWithMaybePost, useProfile } from "~/hooks";
import type { Route } from "./+types/$userOrLongEventId";

function UserPage({ actor }: { actor: string }) {
  const profile = useProfile(actor as ActorIdentifier);

  if (profile == null) {
    throw new Response(null, {
      status: 404,
    });
  }

  return (
    <>
      <title>
        {profile.displayName != null
          ? `${profile.displayName} (@${profile.handle})`
          : `@${profile.handle}`}
      </title>
      <Container size="lg" px="sm" pb="sm">
        <UserDetails profile={profile} />
      </Container>
    </>
  );
}

function EventPage({ id }: { id: string }) {
  const event = useEventWithMaybePost(id);

  if (event == null) {
    throw new Response(null, {
      status: 404,
    });
  }

  return (
    <>
      <title>{event.name}</title>
      <Container size="lg" px="sm" pb="sm">
        <EventDetails event={event} />
      </Container>
    </>
  );
}

export default function Index({
  params: { userOrLongEventId },
}: Route.ComponentProps) {
  return userOrLongEventId[0] == "@" ? (
    <UserPage actor={userOrLongEventId.substring(1)} />
  ) : (
    <EventPage id={userOrLongEventId} />
  );
}
