import { useLingui } from "@lingui/react/macro";
import { Container } from "@mantine/core";
import { useEffect } from "react";
import Editor, { Entry } from "~/components/Editor";
import type { Route } from "./+types/new";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");

  const res = await fetch(`https://data.cons.fyi/cons/${from}.json`);
  if (!res.ok) {
    return null;
  }
  const con = await res.json();
  return con;
}

export default function New({ loaderData }: Route.ComponentProps) {
  const entry = loaderData as Entry;

  const { t } = useLingui();

  useEffect(() => {
    document.title = t`New convention`;
  }, [t]);

  return (
    <Container size="lg" p="sm">
      <Editor entry={entry ?? undefined} />
    </Container>
  );
}
