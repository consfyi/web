import type { ActorIdentifier, Did, ResourceUri } from "@atcute/lexicons";
import { useDLE, useSuspense } from "@data-client/react";
import { TZDate } from "@date-fns/tz";
import { addDays, isAfter, set as setDate } from "date-fns";
import { comparing, sorted } from "iter-fns";
import { use, useEffect, useState, useSyncExternalStore } from "react";
import { LABELER_DID } from "~/config";
import { Client, createClient } from "./bluesky";
import { useGlobalMemo } from "./components/GlobalMemoContext";
import {
  getCons,
  Post,
  Profile,
  useGetAuthorPosts,
  useGetFollows,
  useGetLabelerView,
  useGetLabels,
  useGetLikes,
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

function useConPosts() {
  const resp = useSuspense(useGetAuthorPosts(), { actor: LABELER_DID });
  const posts = useGlobalMemo(
    "conPosts",
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

export interface Con {
  labelId: string;

  id: string;
  name: string;
  start: TZDate;
  end: TZDate;
  url: string;
  location: string;
  country: string | null;
  latLng: [number, number] | null;
  timezone: string | null;
  sources: string[] | null;

  postRkey: string;
}

export type ConWithPost = Con & { post: Post };

export function useCons() {
  const details = useSuspense(getCons, {});

  const labelerView = useSuspense(useGetLabelerView(), { did: LABELER_DID });

  const now = useNow();

  const cons = useGlobalMemo(
    "cons",
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

      return details.flatMap((con) => {
        const label = labelsById[con.id!];
        if (label == undefined) {
          return [];
        }

        const end = setDate(addDays<TZDate, TZDate>(con.endDate!, 1), {
          hours: 12,
          minutes: 0,
          seconds: 0,
          milliseconds: 0,
        });
        if (isAfter(now, end)) {
          return [];
        }

        return [
          {
            labelId: label.labelId,

            id: con.id!,
            name: con.name!,
            start: setDate(con.startDate!, {
              hours: 12,
              minutes: 0,
              seconds: 0,
              milliseconds: 0,
            }),
            end,
            url: con.url!,
            location: con.location!,
            country: con.country!,
            latLng: con.latLng ?? null,
            timezone: con.timezone ?? null,
            sources: con.sources ?? null,

            postRkey: label.postRkey,
          } satisfies Con,
        ];
      });
    },
    [labelerView, now],
  );
  return cons;
}

export function useConsWithPosts() {
  const cons = useCons();
  const conPosts = useConPosts();

  return cons.flatMap((con) =>
    Object.prototype.hasOwnProperty.call(conPosts, con.postRkey)
      ? [{ ...con, post: conPosts[con.postRkey] }]
      : [],
  );
}

export function useLikes(uri: ResourceUri) {
  return useSuspense(useGetLikes(), { uri });
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

function useFollowedConAttendeesGlobalMemo(data: Profile[] | undefined) {
  const { data: labelerView } = useDLE(useGetLabelerView(), {
    did: LABELER_DID,
  });

  return useGlobalMemo(
    "followedConAttendees",
    () => {
      if (data == null || labelerView == null) {
        return null;
      }

      const conIdByLabelId: Record<string, string> = {};
      for (const def of labelerView.policies!.labelValueDefinitions!) {
        conIdByLabelId[def.identifier] = (
          def as typeof def & { fbl_eventId: string }
        ).fbl_eventId;
      }

      const followedCons: Record<string, Profile[]> = {};
      for (const follow of data) {
        for (const label of follow.labels!) {
          if (label.src != LABELER_DID) {
            continue;
          }
          const followed = (followedCons[conIdByLabelId[label.val]] ??= []);
          followed.push(follow);
        }
      }
      for (const k in followedCons) {
        followedCons[k] = sorted(
          followedCons[k],
          comparing((v) => v.handle),
        );
      }
      return followedCons;
    },
    [labelerView, data],
  );
}

export function useFollowedConAttendees() {
  const client = useClient();
  const data = useSuspense(
    useGetFollows(),
    client.did != null ? { actor: client.did } : null,
  );
  return useFollowedConAttendeesGlobalMemo(data);
}

export function useFollowedConAttendeesDLE() {
  const client = useClient();
  const { data, loading, error } = useDLE(
    useGetFollows(),
    client.did != null ? { actor: client.did } : null,
  );
  return { data: useFollowedConAttendeesGlobalMemo(data), loading, error };
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
