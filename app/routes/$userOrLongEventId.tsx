import type { ActorIdentifier } from "@atcute/lexicons";
import { Container } from "@mantine/core";
import { useEffect } from "react";
import EventDetails from "~/components/EventDetails";
import UserDetails from "~/components/UserDetails";
import { useEventsWithPosts, useProfile } from "~/hooks";
import type { Route } from "./+types/$userOrLongEventId";

function UserPage({ actor }: { actor: string }) {
  const profile = useProfile(actor as ActorIdentifier);

  useEffect(() => {
    document.title =
      profile != null
        ? profile.displayName != null
          ? `${profile.displayName} (@${profile.handle})`
          : `@${profile.handle}`
        : "";
  }, [profile]);

  if (profile == null) {
    throw new Response(null, {
      status: 404,
    });
  }

  return (
    <Container size="lg" p="sm">
      <UserDetails profile={profile} />
    </Container>
  );
}

function EventPage({ id }: { id: string }) {
  const events = useEventsWithPosts();

  const event = events != null ? events.find((event) => event.id == id) : null;

  useEffect(() => {
    if (event == null) {
      return;
    }
    document.title = event != null ? event.name : "";
    if (id != event.id) {
      window.history.replaceState(null, "", `/${event.id}`);
    }
  }, [event, id]);

  if (event == null) {
    throw new Response(null, {
      status: 404,
    });
  }

  return (
    <Container size="lg" p="sm">
      <EventDetails event={event} />
    </Container>
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
