import {
  type ActorIdentifier,
  type Did,
  type ResourceUri,
} from "@atcute/lexicons";
import { useDLE, useSuspense } from "@data-client/react";
import { comparing, sorted } from "iter-fns";
import { use, useEffect, useState } from "react";
import { Temporal } from "temporal-polyfill";
import { LABELER_DID } from "~/config";
import { Client, createClient } from "./bluesky";
import { useGlobalMemo } from "./components/GlobalMemoContext";
import {
  Event as EndpointEvent,
  getEvent,
  getEvents,
  Post,
  Profile,
  useGetAuthorPosts,
  useGetFollows,
  useGetLabelerView,
  useGetLabels,
  useGetLikes,
  useGetPost,
  useGetProfile,
} from "./endpoints";

export const useClient = (() => {
  let clientPromise: Promise<Client> | null = null;
  return () => {
    if (clientPromise == null) {
      clientPromise = createClient();
    }
    return use(clientPromise);
  };
})();

function useEventPosts() {
  const resp = useSuspense(useGetAuthorPosts(), { actor: LABELER_DID });
  const posts = useGlobalMemo(
    "eventPosts",
    () => {
      const postsMap: Record<string, Post> = {};
      for (const post of resp) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_did, _collection, rkey] = post
          .uri!.replace(/^at:\/\//, "")
          .split("/");
        postsMap[rkey] = post;
      }
      return postsMap;
    },
    [resp],
  );
  return posts;
}

export interface Event {
  id: string;
  name: string;
  translations: Record<
    string,
    {
      name?: string;
      venue?: string;
      address?: string;
    }
  >;
  locale: string;
  startDate: Temporal.PlainDate;
  startTime: Temporal.ZonedDateTime;
  endDate: Temporal.PlainDate;
  endTime: Temporal.ZonedDateTime;
  url: string;
  venue: string;
  address: string | null;
  latLng: [number, number] | null;
  canceled: boolean;
  sources: string[] | null;
  timezone: string | null;

  labelId: string | null;
  postRkey: string | null;
  post: Post | null;
}

function endpointEventToEvent(event: EndpointEvent) {
  return {
    id: event.id!,
    name: event.name!,
    locale: event.locale!,
    translations: event.translations ?? {},
    startDate: event.startDate!,
    startTime: event.startDate!.toZonedDateTime({
      plainTime: new Temporal.PlainTime(9, 0, 0),
      timeZone: event.timezone ?? "Utc",
    }),
    endDate: event.endDate!,
    endTime: event.endDate!.add({ days: 1 }).toZonedDateTime({
      plainTime: new Temporal.PlainTime(0, 0, 0),
      timeZone: event.timezone ?? "Utc",
    }),
    url: event.url!,
    venue: event.venue!,
    address: event.address ?? null,
    latLng: event.latLng ?? null,
    canceled: event.canceled ?? false,
    timezone: event.timezone ?? null,
    sources: event.sources ?? null,

    labelId: null,
    postRkey: null,
    post: null,
  };
}

export function useEvent(id: string): Event {
  const event = useSuspense(getEvent, { id });
  const labelsById = useLabelsById();
  const label = labelsById[event.id!];
  return {
    ...endpointEventToEvent(event),
    labelId: label != null ? label.labelId : null,
    postRkey: label != null ? label.postRkey : null,
    post: null,
  };
}

export function useLabelsById() {
  const labelerView = useSuspense(useGetLabelerView(), { did: LABELER_DID });

  const labelsById = useGlobalMemo(
    "labelsById",
    () => {
      const labelsById: Record<string, { labelId: string; postRkey: string }> =
        {};

      for (const def of labelerView.policies!.labelValueDefinitions!) {
        const fullDef = def as typeof def & {
          fbl_eventId: string;
          fbl_postRkey: string;
        };

        labelsById[fullDef.fbl_eventId] = {
          labelId: def.identifier,
          postRkey: fullDef.fbl_postRkey,
        };
      }

      return labelsById;
    },
    [labelerView],
  );
  return labelsById;
}

export function useEvents(): Event[] {
  const details = useSuspense(getEvents, {});
  const labelsById = useLabelsById();
  const events = useGlobalMemo(
    "events",
    () => {
      return details.flatMap((event) => {
        const label = labelsById[event.id!];
        if (label == undefined) {
          return [];
        }

        return [
          {
            ...endpointEventToEvent(event),
            labelId: label.labelId,
            postRkey: label.postRkey,
            post: null,
          },
        ];
      });
    },
    [labelsById],
  );
  return events;
}

export function useEventWithMaybePost(id: string): Event {
  const event = useEvent(id);
  const post = usePost(
    event.postRkey != null
      ? `at://${LABELER_DID}/app.bsky.feed.post/${event.postRkey}`
      : null,
  );
  return {
    ...event,
    post: post ?? null,
  };
}
export function useEventsWithPosts() {
  const events = useEvents();
  const eventPosts = useEventPosts();

  return events.flatMap((event) =>
    event.postRkey != null &&
    Object.prototype.hasOwnProperty.call(eventPosts, event.postRkey)
      ? [{ ...event, post: eventPosts[event.postRkey] ?? null }]
      : [],
  );
}

export function useLikes(uri: ResourceUri) {
  return useSuspense(useGetLikes(), { uri });
}

export function usePost(uri: ResourceUri | null) {
  return useSuspense(useGetPost(), uri != null ? { uri } : null);
}

export function useSelf() {
  const client = useClient();
  const resp = useSuspense(
    useGetProfile(),
    client.did != null ? { actor: client.did } : null,
  );
  return resp;
}

export function useProfile(actor: ActorIdentifier | undefined) {
  const resp = useSuspense(useGetProfile(), actor != null ? { actor } : null);
  return resp;
}

export function useProfileLabels(did: Did | undefined) {
  const resp = useSuspense(useGetLabels(), did != null ? { did } : null);
  return resp?.labels;
}

export function useSelfFollowsDLE() {
  const client = useClient();
  const { data, loading, error } = useDLE(
    useGetFollows(),
    client.did != null ? { actor: client.did } : null,
  );

  const follows = useGlobalMemo(
    "selfFollows",
    () => {
      if (data == null) {
        return null;
      }
      const follows = new Set<string>();
      for (const follow of data) {
        follows.add(follow.did!);
      }
      return follows;
    },
    [data],
  );

  return { data: follows, loading, error };
}

function useFollowedEventAttendeesGlobalMemo(data: Profile[] | undefined) {
  "use no memo";

  const { data: labelerView } = useDLE(useGetLabelerView(), {
    did: LABELER_DID,
  });

  return useGlobalMemo(
    "followedEventAttendees",
    () => {
      if (data == null || labelerView == null) {
        return null;
      }

      const eventIdByLabelId: Record<string, string> = {};
      for (const def of labelerView.policies!.labelValueDefinitions!) {
        eventIdByLabelId[def.identifier] = (
          def as typeof def & { fbl_eventId: string }
        ).fbl_eventId;
      }

      const followedEvents: Record<string, Profile[]> = {};
      for (const follow of data) {
        for (const label of follow.labels!) {
          if (label.src != LABELER_DID) {
            continue;
          }
          const followed = (followedEvents[eventIdByLabelId[label.val]] ??= []);
          followed.push(follow);
        }
      }
      for (const k in followedEvents) {
        followedEvents[k] = sorted(
          followedEvents[k],
          comparing((v) => v.handle),
        );
      }
      return followedEvents;
    },
    [labelerView, data],
  );
}

export function useFollowedEventAttendees() {
  const client = useClient();
  const data = useSuspense(
    useGetFollows(),
    client.did != null ? { actor: client.did } : null,
  );
  return useFollowedEventAttendeesGlobalMemo(data);
}

export function useFollowedEventAttendeesDLE() {
  const client = useClient();
  const { data, loading, error } = useDLE(
    useGetFollows(),
    client.did != null ? { actor: client.did } : null,
  );
  return { data: useFollowedEventAttendeesGlobalMemo(data), loading, error };
}

export function useIsLoggedIn() {
  const client = useClient();
  return client.did != null;
}

export function useNow(interval: number = Infinity) {
  const [now, setNow] = useState(() => Temporal.Now.zonedDateTimeISO());
  useEffect(() => {
    const handle =
      interval != Infinity
        ? setInterval(() => {
            setNow(Temporal.Now.zonedDateTimeISO());
          }, interval)
        : null;
    return () => {
      if (handle != null) {
        clearInterval(handle);
      }
    };
  }, [interval, setNow]);
  return now;
}
