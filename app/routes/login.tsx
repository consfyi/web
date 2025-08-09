import { finalizeAuthorization } from "@atcute/oauth-browser-client";
import { Trans } from "@lingui/react/macro";
import { Box, Loader, Text } from "@mantine/core";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { configureOAuth } from "~/bluesky";

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      configureOAuth();

      const params = new URLSearchParams(window.location.hash.slice(1));
      try {
        await finalizeAuthorization(params);
      } catch (e) {
        // Do nothing.
      }

      navigate("/", { replace: true });
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
