import Editor from "~/components/Editor";
import type { Route } from "./+types/$conId.edit";
import { Container } from "@mantine/core";

export default function Edit({ params: { conId } }: Route.ComponentProps) {
  return (
    <Container size="lg">
      <Editor />
    </Container>
  );
}
