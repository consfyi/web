import { Trans } from "@lingui/react/macro";
import { Badge, Tooltip } from "@mantine/core";

export default function GuessedEventMarker() {
  return (
    <Tooltip
      label={
        <Trans>
          The details of this convention have not yet been confirmed.
        </Trans>
      }
    >
      <Badge
        variant="light"
        color="yellow"
        size="xs"
        style={{ verticalAlign: "middle" }}
      >
        <Trans>Unconfirmed</Trans>
      </Badge>
    </Tooltip>
  );
}
