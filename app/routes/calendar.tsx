import CalendarView, { LayoutOptions } from "~/components/events/CalendarView";
import EventsListPage from "~/components/EventsListPage";
import { useEventsWithPosts } from "~/hooks";

export default function Index() {
  const events = useEventsWithPosts();
  return (
    <EventsListPage
      events={events}
      LayoutOptions={LayoutOptions}
      Component={CalendarView}
    />
  );
}
