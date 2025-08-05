import {
  type ActorIdentifier,
  type Did,
  type ResourceUri,
} from "@atcute/lexicons";
import { useDLE, useSuspense } from "@data-client/react";
import { TZDate } from "@date-fns/tz";
import { addDays, set as setDate } from "date-fns";
import { comparing, sorted } from "iter-fns";
import { use, useEffect, useState, useSyncExternalStore } from "react";
import { LABELER_DID } from "~/config";
import { Client, createClient } from "./bluesky";
import { useGlobalMemo } from "./components/GlobalMemoContext";
import {
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

export const useHydrated = (() => {
  const subscribe = () => () => {};
  return () =>
    useSyncExternalStore(
      subscribe,
      () => true,
      () => false,
    );
})();

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
  start: TZDate;
  end: TZDate;
  url: string;
  venue: string;
  address: string | null;
  country: string | null;
  latLng: [number, number] | null;
  canceled: boolean;
  sources: string[] | null;
  timezone: string | null;

  labelId: string | null;
  postRkey: string | null;
}

export type EventWithPost = Event & { post: Post };

export function useEvent(id: string): Event {
  const event = useSuspense(getEvent, { id });
  const labelsById = useLabelsById();
  const label = labelsById[event.id!];
  return {
    id: event.id!,
    name: event.name!,
    start: setDate(event.startDate!, {
      hours: 12,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    }),
    end: setDate(event.endDate!, {
      hours: 12,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    }),
    url: event.url!,
    venue: event.venue!,
    address: event.address ?? null,
    country: event.country!,
    latLng: event.latLng ?? null,
    canceled: event.canceled ?? false,
    timezone: event.timezone ?? null,
    sources: event.sources ?? null,

    labelId: label != null ? label.labelId : null,
    postRkey: label != null ? label.postRkey : null,
  } satisfies Event;
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

export function useEvents() {
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
            id: event.id!,
            name: event.name!,
            start: setDate(event.startDate!, {
              hours: 12,
              minutes: 0,
              seconds: 0,
              milliseconds: 0,
            }),
            end: setDate(event.endDate!, {
              hours: 12,
              minutes: 0,
              seconds: 0,
              milliseconds: 0,
            }),
            url: event.url!,
            venue: event.venue!,
            address: event.address ?? null,
            country: event.country!,
            latLng: event.latLng ?? null,
            canceled: event.canceled ?? false,
            timezone: event.timezone ?? null,
            sources: event.sources ?? null,

            labelId: label.labelId,
            postRkey: label.postRkey,
          } satisfies Event,
        ];
      });
    },
    [labelsById],
  );
  return events;
}

export function useEventWithMaybePost(id: string): Event | EventWithPost {
  const event = useEvent(id);
  const post = usePost(
    event.postRkey != null
      ? `at://${LABELER_DID}/app.bsky.feed.post/${event.postRkey}`
      : null,
  );
  return {
    ...event,
    ...(post != null ? { post } : {}),
  };
}
export function useEventsWithPosts() {
  const events = useEvents();
  const eventPosts = useEventPosts();

  return events.flatMap((event) =>
    Object.prototype.hasOwnProperty.call(eventPosts, event.postRkey)
      ? [{ ...event, post: eventPosts[event.postRkey] }]
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
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const handle =
      interval != Infinity
        ? setInterval(() => {
            setNow(new Date());
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

export function eventHasPost(e: Event): e is EventWithPost {
  return "post" in e;
}
