import { type Label } from "@atcute/atproto/types/label/defs";
import { type Preferences as ActorPreferences } from "@atcute/bluesky/types/app/actor/defs";
import { type LabelerPolicies } from "@atcute/bluesky/types/app/labeler/defs";
import {
  type ActorIdentifier,
  type Did,
  type ResourceUri,
} from "@atcute/lexicons";
import { Endpoint, Entity, schema } from "@data-client/endpoint";
import { useController } from "@data-client/react";
import { Temporal } from "temporal-polyfill";
import {
  getEvent as dataGetEvent,
  getEvents as dataGetEvents,
} from "./dataconsfyi";
import { useClient } from "./hooks";

export class ProfileLabels extends Entity {
  static key = "ProfileLabels";

  public did?: Did;
  public labels?: Label[];

  pk() {
    return this.did;
  }
}

export class Event extends Entity {
  static key = "Event";

  public id?: string;
  public name?: string;
  public locale?: string;
  public translations?: Record<
    string,
    {
      name?: string;
      venue?: string;
      address?: string;
    }
  >;
  public url?: string;
  public startDate?: Temporal.PlainDate;
  public endDate?: Temporal.PlainDate;
  public venue?: string;
  public address?: string;
  public latLng?: [number, number];
  public canceled?: boolean;
  public sources?: string[];
  public timezone?: string;

  pk() {
    return this.id;
  }
}

export class Profile extends Entity {
  static key = "Profile";

  public did?: Did;
  public handle?: string;
  public displayName?: string;
  public description?: string;
  public avatar?: string;
  public labels?: Label[];

  pk() {
    return this.did;
  }
}

export class Post extends Entity {
  static key = "Post";

  public uri?: ResourceUri;
  public cid?: string;
  public likeCount?: number;
  public viewer?: { like?: ResourceUri };

  pk() {
    return this.uri;
  }
}

export class Like extends Entity {
  static key = "Like";

  public actor?: Profile;

  pk() {
    return this.actor?.did;
  }

  static schema = {
    actor: Profile,
  };
}

export class Preferences extends Entity {
  static key = "Preferences";

  public preferences?: ActorPreferences;

  pk() {
    return "preferences";
  }
}

export class LabelerView extends Entity {
  static key = "LabelerView";

  public uri?: ResourceUri;
  public policies?: LabelerPolicies;

  pk() {
    return this.uri;
  }
}

export function useGetPost() {
  "use no memo";

  const client = useClient();

  return new Endpoint(
    async function ({ uri }: { uri: ResourceUri }) {
      const thread = await client.getPostThread(uri, {
        signal: this.signal,
      });
      if (thread == null) {
        throw new Response(null, {
          status: 404,
        });
      }
      return Post.fromJS(thread.post);
    },
    {
      name: "getPost",
      schema: Post,
      signal: undefined as AbortSignal | undefined,
    },
  );
}
export function useGetAuthorPosts() {
  "use no memo";

  const client = useClient();

  return new Endpoint(
    async function ({ actor }: { actor: ActorIdentifier }) {
      const posts = [];
      for await (const postView of client.getAuthorPosts(actor, {
        signal: this.signal,
      })) {
        posts.push(Post.fromJS(postView));
      }
      return posts;
    },
    {
      name: "getAuthorPosts",
      schema: new schema.Collection([Post]),
      signal: undefined as AbortSignal | undefined,
    },
  );
}

export function useGetProfile() {
  "use no memo";

  const client = useClient();

  return new Endpoint(
    async function ({ actor }: { actor: ActorIdentifier }) {
      const profile = await client.getProfile(actor, {
        signal: this.signal,
      });
      if (profile == null) {
        throw new Response(null, {
          status: 404,
        });
      }
      return Profile.fromJS(profile);
    },
    {
      name: "getProfile",
      schema: Profile,
      signal: undefined as AbortSignal | undefined,
    },
  );
}

export function useGetLikes() {
  "use no memo";

  const client = useClient();

  return new Endpoint(
    async function ({ uri }: { uri: ResourceUri }) {
      const likes = [];
      for await (const like of client.getLikes(uri, { signal: this.signal })) {
        likes.push(Like.fromJS({ ...like, actor: Profile.fromJS(like.actor) }));
      }
      return likes;
    },
    {
      name: "getLikes",
      schema: new schema.Collection([Like]),
      signal: undefined as AbortSignal | undefined,
    },
  );
}

export const getEvents = new Endpoint(
  // eslint-disable-next-line no-empty-pattern, @typescript-eslint/ban-types
  async function ({}: {}) {
    const events = [];
    for await (const event of dataGetEvents({ signal: this.signal })) {
      events.push(Event.fromJS(event));
    }
    return events;
  },
  {
    name: "getEvents",
    schema: new schema.Collection([Event]),
    signal: undefined as AbortSignal | undefined,
  },
);

export const getEvent = new Endpoint(
  async function ({ id }: { id: string }) {
    return Event.fromJS(await dataGetEvent(id, { signal: this.signal }));
  },
  {
    name: "getEvent",
    schema: Event,
    signal: undefined as AbortSignal | undefined,
  },
);

export function useGetFollows() {
  "use no memo";

  const client = useClient();

  return new Endpoint(
    async function ({ actor }: { actor: ActorIdentifier }) {
      const follows = [];
      for await (const follow of client.getFollows(actor, {
        signal: this.signal,
      })) {
        follows.push(Profile.fromJS(follow));
      }
      return follows;
    },
    {
      name: "getFollows",
      schema: new schema.Collection([Profile]),
      signal: undefined as AbortSignal | undefined,
    },
  );
}

export function useGetLabelerView() {
  "use no memo";

  const client = useClient();

  return new Endpoint(
    async function ({ did }: { did: Did }) {
      return LabelerView.fromJS(
        await client.getLabelerView(did, { signal: this.signal }),
      );
    },
    {
      name: "getLabelerView",
      schema: LabelerView,
      signal: undefined as AbortSignal | undefined,
    },
  );
}

export function useLikePost() {
  "use no memo";

  const client = useClient();
  const ctrl = useController();

  return new Endpoint(
    async function ({ uri }: { uri: ResourceUri }) {
      const post = ctrl.get(Post, { uri }, ctrl.getState());
      if (post == null) {
        throw new Response(null, {
          status: 404,
        });
      }

      if (post.viewer == null || post.viewer.like != null) {
        return;
      }

      post.viewer.like = await client.like(uri, post.cid!, {
        signal: this.signal,
      });
      post.likeCount = (post.likeCount ?? 0) + 1;

      ctrl.set(Post, { uri }, post);
    },
    {
      name: "likePost",
      sideEffect: true,
      signal: undefined as AbortSignal | undefined,
    },
  );
}

export function useUnlikePost() {
  "use no memo";

  const client = useClient();
  const ctrl = useController();

  return new Endpoint(
    async function ({ uri }: { uri: ResourceUri }) {
      const post = ctrl.get(Post, { uri }, ctrl.getState());
      if (post == null) {
        throw new Response(null, {
          status: 404,
        });
      }

      if (post.viewer == null || post.viewer.like == null) {
        return;
      }

      await client.deleteRecord(post.viewer.like, { signal: this.signal });

      post.viewer.like = undefined;
      post.likeCount = (post.likeCount ?? 0) - 1;

      ctrl.set(Post, { uri }, post);
    },
    {
      name: "unlikePost",
      sideEffect: true,
      signal: undefined as AbortSignal | undefined,
    },
  );
}

export function useGetPreferences() {
  "use no memo";

  const client = useClient();

  return new Endpoint(
    async function () {
      if (client.did == null) {
        return Preferences.fromJS({});
      }

      return Preferences.fromJS({
        preferences: await client.getPreferences({ signal: this.signal }),
      });
    },
    {
      name: "getPreferences",
      schema: Preferences,
      signal: undefined as AbortSignal | undefined,
    },
  );
}

export function usePutPreferences() {
  "use no memo";

  const client = useClient();

  return new Endpoint(
    async function ({ preferences }: { preferences: ActorPreferences }) {
      await client.putPreferences(preferences, { signal: this.signal });
      return Preferences.fromJS({ preferences });
    },
    {
      name: "putPreferences",
      sideEffect: true,
      schema: Preferences,
      signal: undefined as AbortSignal | undefined,
    },
  );
}

export function useGetLabels() {
  "use no memo";

  const client = useClient();

  return new Endpoint(
    async function ({ did }: { did: Did }) {
      const labels = [];
      for await (const label of client.getLabels(did, {
        signal: this.signal,
      })) {
        labels.push(label);
      }
      return ProfileLabels.fromJS({ did, labels });
    },
    {
      name: "getLabels",
      schema: ProfileLabels,
      signal: undefined as AbortSignal | undefined,
    },
  );
}
