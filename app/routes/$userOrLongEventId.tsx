import type { ActorIdentifier } from "@atcute/lexicons";
import { match } from "@formatjs/intl-localematcher";
import { useLingui } from "@lingui/react";
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

  const { i18n } = useLingui();

  const locale = match(
    [i18n.locale],
    [event.locale, ...Object.keys(event.translations)],
    event.locale,
  );

  return (
    <>
      <title lang={locale}>
        {event.translations[locale]?.name ?? event.name}
      </title>
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
