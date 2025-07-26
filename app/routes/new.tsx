import { useLingui } from "@lingui/react/macro";
import { Container } from "@mantine/core";
import { useEffect } from "react";
import Editor from "~/components/Editor";

export default function New() {
  const { t } = useLingui();

  useEffect(() => {
    document.title = t`New convention`;
  }, [t]);

  return (
    <Container size="lg" p="sm">
      <Editor />
    </Container>
  );
}
