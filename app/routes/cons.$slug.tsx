import { Navigate } from "react-router";
import { useEventsWithPosts } from "~/hooks";
import type { Route } from "./+types/cons.$slug";

export default function Index({ params: { slug } }: Route.ComponentProps) {
  const events = useEventsWithPosts();
  const event =
    events != null
      ? events.find((event) => event.id == slug || event.labelId == slug)
      : null;
  if (event == null) {
    throw new Response(null, {
      status: 404,
    });
  }

  return <Navigate replace to={`/${event.id}`} />;
}
