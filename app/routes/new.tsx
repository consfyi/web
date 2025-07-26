import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Anchor, Container, Text } from "@mantine/core";
import { useEffect } from "react";
import Editor, { Entry } from "~/components/Editor";
import type { Route } from "./+types/new";
import { IconInfoCircle } from "@tabler/icons-react";
import { Link } from "react-router";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");

  const res = await fetch(`https://data.cons.fyi/cons/${from}.json`);
  if (!res.ok) {
    return null;
  }
  const con = (await res.json()) as Entry;
  return {
    ...con,
    previousInstanceId: from ?? undefined,
  };
}

export default function New({ loaderData }: Route.ComponentProps) {
  const { t } = useLingui();

  useEffect(() => {
    document.title = t`New convention`;
  }, [t]);

  return (
    <Container size="lg" p="sm">
      {loaderData != null ? (
        <Alert mb="xs" icon={<IconInfoCircle />}>
          <Text size="sm">
            <Trans>
              This convention will be linked to{" "}
              <Anchor
                component={Link}
                to={`/cons/${loaderData.previousInstanceId}`}
                target="_blank"
              >
                {loaderData.name}
              </Anchor>{" "}
              as its next instance.
            </Trans>
          </Text>
        </Alert>
      ) : null}
      <Editor
        entry={
          loaderData != null
            ? {
                ...loaderData,
                name: loaderData.name.replace(/(\d+)$/, (x: string) =>
                  (parseInt(x) + 1).toString(),
                ),
                startDate: "",
                endDate: "",
              }
            : undefined
        }
      />
    </Container>
  );
}
