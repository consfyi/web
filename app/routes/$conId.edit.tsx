import { Container } from "@mantine/core";
import Editor, { Entry } from "~/components/Editor";
import type { Route } from "./+types/$conId.edit";
import { useLingui } from "@lingui/react/macro";
import { useEffect } from "react";

export async function clientLoader({
  params: { conId },
}: Route.ClientLoaderArgs) {
  const res = await fetch(`https://data.cons.fyi/cons/${conId}.json`);
  if (!res.ok) {
    return null;
  }
  const con = await res.json();
  return con;
}

export default function Edit({
  params: { conId },
  loaderData,
}: Route.ComponentProps) {
  const entry = loaderData as Entry;

  const { t } = useLingui();

  if (entry == null) {
    throw new Response(null, {
      status: 404,
    });
  }

  useEffect(() => {
    document.title = t`Edit convention: ${entry.name}`;
  }, [entry, t]);

  return (
    <Container size="lg" p="sm">
      <Editor id={conId} entry={entry} />
    </Container>
  );
}
