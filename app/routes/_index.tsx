import { type MetaFunction } from "react-router";
import clientMetadata from "~/../public/client-metadata.json";
import ListView, { LayoutOptions } from "~/components/events/ListView";
import EventsListPage from "~/components/EventsListPage";

export const meta: MetaFunction = ({ matches }) => [
  ...matches.flatMap((match) => match.meta ?? []),
  { title: clientMetadata.client_name },
];

export default function Index() {
  return <EventsListPage LayoutOptions={LayoutOptions} Component={ListView} />;
}
