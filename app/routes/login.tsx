import { finalizeAuthorization } from "@atcute/oauth-browser-client";
import { Trans } from "@lingui/react/macro";
import { Box, Loader, Text } from "@mantine/core";
import { useEffect } from "react";
import { configureOAuth } from "~/bluesky";

export default function Login() {
  useEffect(() => {
    (async () => {
      configureOAuth();

      const params = new URLSearchParams(window.location.hash.slice(1));
      try {
        await finalizeAuthorization(params);
      } catch (e) {
        // Do nothing.
      }

      // Don't use useNavigate, we need to do an actual refresh to ensure the client is up to date.
      window.location.replace("/");
      window.location.reload();
    })();
  });

  return (
    <Box p={56} ta="center">
      <Text size="md" fw={500} mb="md">
        <Trans>Logging you in...</Trans>
      </Text>
      <Loader />
    </Box>
  );
}
