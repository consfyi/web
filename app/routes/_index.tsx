import ListView, { LayoutOptions } from "~/components/events/ListView";
import EventsListPage from "~/components/EventsListPage";
import { useEventsWithPosts } from "~/hooks";

export default function Index() {
  const events = useEventsWithPosts();
  return (
    <EventsListPage
      events={events}
      LayoutOptions={LayoutOptions}
      Component={ListView}
    />
  );
}
