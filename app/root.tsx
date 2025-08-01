import {
  DataProvider,
  useController,
  useDLE,
  useLoading,
} from "@data-client/react";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Alert,
  Anchor,
  Autocomplete,
  Box,
  Button,
  Center,
  Collapse,
  ColorSchemeScript,
  Container,
  createTheme,
  DirectionProvider,
  type DirectionProviderProps,
  Group,
  Image,
  Loader,
  mantineHtmlProps,
  MantineProvider,
  Menu,
  Text,
  TextInput,
  useMantineColorScheme,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import {
  completeNavigationProgress,
  NavigationProgress,
  startNavigationProgress,
} from "@mantine/nprogress";
import {
  IconAlertTriangle,
  IconBrandBluesky,
  IconCheck,
  IconChevronDown,
  IconLogout2,
  IconMoon,
  IconPaw,
  IconSearch,
  IconSettings,
  IconSun,
  IconSunMoon,
} from "@tabler/icons-react";
import IntlLocale from "intl-locale-textinfo-polyfill";
import {
  forwardRef,
  type Ref,
  Suspense,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Link,
  Links,
  type LinksFunction,
  Meta,
  type MetaFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useNavigate,
  useNavigation,
  useRouteError,
} from "react-router";
import clientMetadata from "~/../public/client-metadata.json";
import Avatar from "~/components/Avatar";
import { DEFAULT_PDS_HOST, startLogin } from "./bluesky";
import DatesProvider from "./components/DatesProvider";
import EmptyIcon from "./components/EmptyIcon";
import { GlobalMemoProvider } from "./components/GlobalMemoContext";
import {
  GlobalSearchContext,
  GlobalSearchProvider,
} from "./components/GlobalSearchContext";
import LinguiProvider, { INITIAL_LOCALE } from "./components/LinguiProvider";
import LocaleSelector from "./components/LocaleSelector";
import { LABELER_DID } from "./config";
import { useGetPreferences, usePutPreferences } from "./endpoints";
import { useClient, useHydrated, useIsLoggedIn, useSelf } from "./hooks";

import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/nprogress/styles.css";
import { HeaderHeightProvider } from "./components/HeaderHeightProvider";
import "./styles.css";

const theme = createTheme({});

export const links: LinksFunction = () => {
  return [
    {
      rel: "icon",
      href: "/logo.png",
      type: "image/png",
    },
  ];
};

export const meta: MetaFunction = ({ matches }) => [
  ...matches.flatMap((match) => match.meta ?? []),
  {
    name: "description",
    content: "Which furry conventions are you going to?",
  },
];

// eslint-disable-next-line no-empty-pattern, @typescript-eslint/ban-types
const Header = forwardRef(function Header({}: {}, ref: Ref<HTMLDivElement>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pdsHost, setPdsHost] = useLocalStorage({
    key: "fbl:pdsHost",
    defaultValue: "",
    getInitialValueInEffect: false,
  });

  const realPdsHost =
    pdsHost != ""
      ? pdsHost.replace(/^(?!https:\/\/)/, "https://")
      : DEFAULT_PDS_HOST;

  const usingDefaultPdsHost = realPdsHost == DEFAULT_PDS_HOST;

  const [loginError, setLoginError] = useState<unknown | null>(null);
  const [pending, setIsPending] = useState(false);

  const { t } = useLingui();
  const client = useClient();
  const self = useSelf();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const [inViewport, setInViewport] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const observedRef = useCallback(
    (el: HTMLElement | null) => {
      if (el == null) {
        if (observer.current != null) {
          observer.current.disconnect();
        }
        setInViewport(true);
        return;
      }

      if (observer.current == null) {
        observer.current = new IntersectionObserver((entries) =>
          setInViewport(entries.some((entry) => entry.isIntersecting)),
        );
      }
      observer.current.observe(el);
    },
    [setInViewport],
  );

  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();
  const { query, setQuery } = use(GlobalSearchContext)!;
  const autocompleteRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <div
        ref={observedRef}
        style={{ position: "absolute", top: "0px", left: "0px" }}
      />
      <Box
        ref={ref}
        style={{
          transitionProperty:
            "border-bottom-color, background, backdrop-filter",
          transitionDuration: "0.1s",
          transitionTimingFunction: "ease-out",
          borderBottomWidth: "1px",
          borderBottomStyle: "solid",
          position: "sticky",
          top: "0px",
          zIndex: "var(--mantine-z-index-app)",
          ...(inViewport
            ? {
                borderBottomColor: "transparent",
              }
            : {
                backdropFilter: "blur(5px)",
                borderBottomColor: "var(--mantine-color-default-border)",
                background:
                  "color-mix(in srgb, var(--mantine-color-body), transparent 15%)",
              }),
        }}
      >
        <Container size="lg" p="sm">
          <Group justify="space-between" wrap="nowrap" gap="md">
            <Anchor
              component={Link}
              to="/"
              aria-label={clientMetadata.client_name}
            >
              <Group gap={7}>
                <Image
                  src="/logo.png"
                  h={34}
                  w={34}
                  my={-4}
                  alt={clientMetadata.client_name}
                  style={{
                    filter:
                      "drop-shadow(0px 0px 2px color-mix(in srgb, var(--mantine-color-body), transparent 50%))",
                  }}
                />
                <Text
                  fw={500}
                  size="lg"
                  lh={1}
                  visibleFrom="sm"
                  style={{
                    textShadow:
                      "0px 0px 2px color-mix(in srgb, var(--mantine-color-body), transparent 50%)",
                  }}
                >
                  {clientMetadata.client_name}
                </Text>
              </Group>
            </Anchor>
            <Box
              component={"form"}
              style={{ flexGrow: 1 }}
              action="/"
              onSubmit={(e) => {
                e.preventDefault();
                const searchParams = new URLSearchParams();
                searchParams.set("q", query);
                navigate({
                  pathname: "/",
                  search: searchParams.toString(),
                });
              }}
            >
              <Autocomplete
                ref={autocompleteRef}
                visibleFrom={showSearch ? undefined : "sm"}
                name="q"
                filter={({ options }) => options}
                leftSection={
                  <IconSearch size={16} style={{ marginLeft: "2px" }} />
                }
                clearable
                placeholder={t`Search`}
                value={query}
                onChange={(q) => {
                  setQuery(q);
                }}
                onBlur={() => {
                  setShowSearch(false);
                }}
              />
              <Button
                display={showSearch ? "none" : undefined}
                variant="subtle"
                color="var(--mantine-color-dimmed)"
                c="var(--mantine-color-dimmed)"
                hiddenFrom="sm"
                p="xs"
                aria-label={t`Search`}
                onClick={() => {
                  setShowSearch(true);
                  setTimeout(() => {
                    if (autocompleteRef.current == null) {
                      return;
                    }
                    autocompleteRef.current.focus();
                  }, 0);
                }}
              >
                <IconSearch size={16} />
              </Button>
            </Box>
            <Group gap="md" visibleFrom={showSearch ? "sm" : undefined}>
              <Menu position="bottom-end" withArrow>
                <Menu.Target>
                  <Button
                    px="xs"
                    variant="subtle"
                    color="var(--mantine-color-dimmed)"
                    c="dimmed"
                    rightSection={<IconChevronDown size={14} />}
                  >
                    <IconSettings size={18} />
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>
                    <Trans>Color scheme</Trans>
                  </Menu.Label>
                  <Menu.Item
                    onClick={() => {
                      setColorScheme("auto");
                    }}
                    leftSection={
                      <Group gap={6}>
                        {colorScheme == "auto" ? (
                          <IconCheck size={14} />
                        ) : (
                          <EmptyIcon size={14} />
                        )}
                        <IconSunMoon size={14} />
                      </Group>
                    }
                  >
                    <Trans>Auto</Trans>
                  </Menu.Item>
                  <Menu.Item
                    onClick={() => {
                      setColorScheme("light");
                    }}
                    leftSection={
                      <Group gap={6}>
                        {colorScheme == "light" ? (
                          <IconCheck size={14} />
                        ) : (
                          <EmptyIcon size={14} />
                        )}
                        <IconSun size={14} />
                      </Group>
                    }
                  >
                    <Trans>Light</Trans>
                  </Menu.Item>
                  <Menu.Item
                    onClick={() => {
                      setColorScheme("dark");
                    }}
                    leftSection={
                      <Group gap={6}>
                        {colorScheme == "dark" ? (
                          <IconCheck size={14} />
                        ) : (
                          <EmptyIcon size={14} />
                        )}
                        <IconMoon size={14} />
                      </Group>
                    }
                  >
                    <Trans>Dark</Trans>
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              {self != null ? (
                <Menu
                  position="bottom-end"
                  withArrow
                  opened={menuOpen}
                  onChange={(value) => {
                    if (!value && pending) {
                      return;
                    }
                    setMenuOpen(value);
                  }}
                >
                  <Menu.Target>
                    <Button
                      variant="default"
                      color="var(--mantine-color-dimmed)"
                      c="var(--mantine-color-text)"
                      leftSection={
                        <Avatar
                          src={self.avatar}
                          alt={`@${self.handle}`}
                          size="sm"
                        />
                      }
                      px="xs"
                      rightSection={<IconChevronDown size={14} />}
                    >
                      <Text span size="sm" fw={500} visibleFrom="xs">
                        @{self.handle}
                      </Text>
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label hiddenFrom="xs">@{self.handle}</Menu.Label>
                    <Button
                      fullWidth
                      loading={pending}
                      color="red"
                      variant="subtle"
                      leftSection={<IconLogout2 size={18} />}
                      onClick={() => {
                        setIsPending(true);
                        setMenuOpen(true);

                        (async () => {
                          await client.logout();
                          window.location.replace(window.location.toString());
                        })();
                      }}
                    >
                      <Trans>Log out</Trans>
                    </Button>
                  </Menu.Dropdown>
                </Menu>
              ) : (
                <form
                  onSubmit={(evt) => {
                    evt.preventDefault();
                    setIsPending(true);
                    (async () => {
                      try {
                        await startLogin(realPdsHost);
                      } catch (e) {
                        if (!usingDefaultPdsHost) {
                          setMenuOpen(true);
                          setLoginError(e);
                        }
                      } finally {
                        setIsPending(false);
                      }
                    })();
                  }}
                >
                  <Button.Group>
                    <Button
                      loading={pending}
                      type="submit"
                      size="sm"
                      style={{
                        paddingInlineStart: "var(--mantine-spacing-xs)",
                        paddingInlineEnd: "calc(var(--mantine-spacing-xs) / 2)",
                      }}
                      leftSection={<IconBrandBluesky size={18} />}
                      color={!usingDefaultPdsHost ? "#8338ec" : "#3c81f6"}
                    >
                      {!usingDefaultPdsHost ? (
                        <Trans>
                          Log in via {realPdsHost.replace(/^https?:\/\//, "")}
                        </Trans>
                      ) : (
                        <Trans>Log in</Trans>
                      )}
                    </Button>
                    <Menu
                      position="bottom-end"
                      withArrow
                      opened={menuOpen}
                      onChange={(value) => {
                        if (!value && pending) {
                          return;
                        }
                        setMenuOpen(value);
                      }}
                    >
                      <Menu.Target>
                        <Button
                          size="sm"
                          style={{
                            paddingInlineStart:
                              "calc(var(--mantine-spacing-xs) / 2)",
                            paddingInlineEnd: "var(--mantine-spacing-xs)",
                          }}
                          title={t`Log in via custom PDS`}
                          color={!usingDefaultPdsHost ? "#8338ec" : "#3c81f6"}
                        >
                          <IconChevronDown size={14} />
                        </Button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <TextInput
                          label={<Trans>Custom PDS</Trans>}
                          name="pds"
                          m={4}
                          w={300}
                          disabled={pending}
                          error={
                            loginError != null ? (
                              <Trans>
                                Couldn’t log in with this PDS. Is the URL
                                correct?
                              </Trans>
                            ) : null
                          }
                          placeholder={t`https://your.pds.com`}
                          value={pdsHost}
                          onChange={(e) => {
                            setPdsHost(e.target.value);
                            setLoginError(null);
                          }}
                        />
                      </Menu.Dropdown>
                    </Menu>
                  </Button.Group>
                </form>
              )}
            </Group>
          </Group>
        </Container>
      </Box>
    </>
  );
});

function Footer() {
  return (
    <Box
      style={{
        borderTop: "1px solid var(--mantine-color-default-border)",
      }}
    >
      <Container
        size="lg"
        display="flex"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          textAlign: "center",
          flexDirection: "column",
        }}
        p="sm"
      >
        <Text c="dimmed" size="sm" mb="sm">
          <Trans>
            Data sourced from{" "}
            <Anchor href="https://data.cons.fyi" target="_blank">
              data.cons.fyi
            </Anchor>
            . Convention missing?{" "}
            <Anchor
              href="https://github.com/consfyi/data/issues/new?template=missing-or-incorrect-convention.md"
              target="_blank"
            >
              File an issue here.
            </Anchor>
          </Trans>
        </Text>
        <Group gap={8} justify="flex-end" wrap="nowrap" mb="sm">
          <ActionIcon
            aria-label="Bluesky"
            component="a"
            href="https://bsky.app/profile/cons.fyi"
            target="_blank"
            size="md"
            color="gray"
            variant="subtle"
          >
            <IconBrandBluesky size={18} stroke={1.5} />
          </ActionIcon>
        </Group>
        <LocaleSelector />
      </Container>
    </Box>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const { t } = useLingui();

  if (!(error instanceof Response)) {
    throw error;
  }

  if (error.status != 404) {
    throw error;
  }

  useEffect(() => {
    document.title = t`Not found`;
  }, [t]);

  return (
    <Container size="lg" p={0}>
      <Box p={56} ta="center">
        <Text size="xl" fw={500} mb="sm">
          <Trans>Not found</Trans>
        </Text>
        <Text>
          <Trans>The page you requested could not be found.</Trans>
        </Text>
      </Box>
    </Container>
  );
}

function LoadingIndicator() {
  const { state } = useNavigation();
  useEffect(() => {
    if (state === "idle") {
      completeNavigationProgress();
    } else {
      startNavigationProgress();
    }
  }, [state]);
  return <NavigationProgress />;
}

function Welcome() {
  const [closed, setClosed] = useLocalStorage({
    key: "fbl:welcome:closed",
    getInitialValueInEffect: false,
    defaultValue: false,
  });

  return (
    <Collapse in={!closed}>
      <Alert
        my={{ lg: "xs" }}
        mx={{ base: 0, lg: "xs" }}
        icon={<IconPaw />}
        title={<Trans>Welcome!</Trans>}
        onClose={() => {
          setClosed(true);
        }}
        withCloseButton
      >
        <Trans>
          <Text size="sm" mb="xs">
            This the website for the{" "}
            <Anchor href="https://bsky.app/profile/cons.fyi" target="_blank">
              <IconBrandBluesky size={12} /> @cons.fyi
            </Anchor>{" "}
            service. For the full experience, please log in. You’ll be able to:
          </Text>
          {/* Using the List component here is wacky, so we don't use it */}
          <ul
            style={{
              marginTop: 0,
              marginBottom: "var(--mantine-spacing-xs)",
              paddingLeft: "var(--mantine-spacing-xl)",
            }}
          >
            <li>
              Tell people which cons you’re going to (you can also do this by
              liking the con post on Bluesky).
            </li>
            <li>See who you follow is going to a con.</li>
          </ul>
          <Text size="sm" mb="xs">
            <strong>Note:</strong> If you’re using a self-hosted PDS, you’ll
            need to use the dropdown next to the Log in button to specify it.
          </Text>
          <Text size="sm">
            A huge thank you to{" "}
            <Anchor href="https://furrycons.com" target="_blank">
              FurryCons.com
            </Anchor>{" "}
            who provides all the data on conventions!
          </Text>
        </Trans>
      </Alert>
    </Collapse>
  );
}

function NotSubscribedToLabelerAlert() {
  const getPreferences = useGetPreferences();
  const { data: preferences } = useDLE(getPreferences);

  const putPreferences = usePutPreferences();
  const ctrl = useController();

  const [doSubscribe, loading] = useLoading(async () => {
    // Refetch preferences, just so we don't clobber any preferences that may have changed in the meantime with our old preferences.
    const prefs = (await ctrl.fetch(getPreferences)).preferences!;

    let labelersPref = prefs.find(
      (pref) => pref.$type == "app.bsky.actor.defs#labelersPref",
    );
    if (labelersPref == null) {
      labelersPref = {
        $type: "app.bsky.actor.defs#labelersPref",
        labelers: [],
      };
      prefs.push(labelersPref);
    }
    labelersPref.labelers.push({ did: LABELER_DID });

    await ctrl.fetch(putPreferences, { preferences: prefs });
  }, [ctrl, preferences, putPreferences]);

  const subscribedToLabeler =
    preferences == null ||
    preferences.preferences == null ||
    preferences.preferences.some(
      (preference) =>
        preference.$type == "app.bsky.actor.defs#labelersPref" &&
        preference.labelers.some((labeler) => labeler.did == LABELER_DID),
    );

  return (
    <Collapse in={!subscribedToLabeler}>
      <Alert
        my={{ lg: "xs" }}
        mx={{ base: 0, lg: "xs" }}
        icon={<IconAlertTriangle />}
        title={<Trans>Not subscribed to labeler</Trans>}
        color="yellow"
      >
        <Text size="sm" mb="xs">
          <Trans>
            You are currently not subscribed to the labeler. That means you
            won’t be able to see other people’s con labels on Bluesky.
          </Trans>
        </Text>
        <Button
          size="sm"
          color="yellow"
          loading={loading}
          onClick={() => {
            doSubscribe();
          }}
        >
          <Trans>Fix this for me</Trans>
        </Button>
      </Alert>
    </Collapse>
  );
}

function Alerts() {
  const isLoggedIn = useIsLoggedIn();

  return (
    <>
      {!isLoggedIn ? <Welcome /> : null}
      <NotSubscribedToLabelerAlert />
    </>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();

  useEffect(() => {
    if (navigator.userAgent.indexOf("iPhone") > -1) {
      document
        .querySelector("meta[name=viewport]")!
        .setAttribute(
          "content",
          "width=device-width, initial-scale=1, maximum-scale=1",
        );
    }
  }, []);

  const location = useLocation();
  const showAlerts = !["/map", "/login"].includes(location.pathname);

  return (
    // lang is set by LinguiProvider.
    // eslint-disable-next-line jsx-a11y/html-has-lang
    <html {...mantineHtmlProps}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <GlobalMemoProvider>
          <MantineProvider theme={theme} defaultColorScheme="auto">
            <LoadingIndicator />
            {hydrated ? (
              <DirectionProvider
                initialDirection={
                  new IntlLocale(INITIAL_LOCALE).textInfo
                    .direction as DirectionProviderProps["initialDirection"]
                }
              >
                <DataProvider>
                  <Suspense
                    fallback={
                      <Center p="lg">
                        <Loader />
                      </Center>
                    }
                  >
                    <LinguiProvider>
                      <DatesProvider>
                        <GlobalSearchProvider>
                          <Header />
                          <HeaderHeightProvider value={61}>
                            {showAlerts ? (
                              <Container size="lg" px={0}>
                                <Alerts />
                              </Container>
                            ) : null}
                            <Suspense
                              fallback={
                                <Center p="lg">
                                  <Loader />
                                </Center>
                              }
                            >
                              {children}
                            </Suspense>
                          </HeaderHeightProvider>
                          <Footer />
                        </GlobalSearchProvider>
                      </DatesProvider>
                    </LinguiProvider>
                  </Suspense>
                </DataProvider>
              </DirectionProvider>
            ) : null}
          </MantineProvider>
        </GlobalMemoProvider>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
