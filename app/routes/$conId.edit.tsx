import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Anchor, Container, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useEffect } from "react";
import { Link } from "react-router";
import Editor, { Entry } from "~/components/Editor";
import type { Route } from "./+types/$conId.edit";

export async function clientLoader({
  params: { conId },
}: Route.ClientLoaderArgs) {
  const res = await fetch(`https://data.cons.fyi/cons/${conId}.json`);
  if (!res.ok) {
    return null;
  }
  const con = await res.json();
  return con as Entry;
}

export default function Edit({
  params: { conId },
  loaderData,
}: Route.ComponentProps) {
  const { t } = useLingui();

  if (loaderData == null) {
    throw new Response(null, {
      status: 404,
    });
  }

  useEffect(() => {
    document.title = t`Edit convention: ${loaderData.name}`;
  }, [loaderData, t]);

  return (
    <Container size="lg" p="sm">
      <Alert mb="xs" icon={<IconInfoCircle />}>
        <Text size="sm">
          <Trans>
            You are proposing an edit to{" "}
            <Anchor component={Link} to={`/cons/${conId}`} target="_blank">
              {loaderData.name}
            </Anchor>
            .
          </Trans>
        </Text>
      </Alert>
      <Editor id={conId} entry={loaderData} />
    </Container>
  );
}
