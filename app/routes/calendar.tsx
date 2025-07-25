import { type MetaFunction } from "react-router";
import clientMetadata from "~/../public/client-metadata.json";
import CalendarView, { LayoutOptions } from "~/components/cons/CalendarView";
import ConsListPage from "~/components/ConsListPage";

export const meta: MetaFunction = ({ matches }) => [
  ...matches.flatMap((match) => match.meta ?? []),
  { title: clientMetadata.client_name },
];

export default function Index() {
  return (
    <ConsListPage LayoutOptions={LayoutOptions} Component={CalendarView} />
  );
}
