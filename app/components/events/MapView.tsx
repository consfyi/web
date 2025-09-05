import { Box, Center, Container, Loader } from "@mantine/core";
import { Suspense, use, useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Temporal } from "temporal-polyfill";
import { type Event, useNow } from "~/hooks";
import * as qp from "~/qp";
import EmptyState from "../EmptyState";
import EventRow from "../EventRow";
import FilterBar, {
  FilterOptions,
  LayoutSwitcher,
  useFilterPredicate,
} from "../FilterBar";
import { useHeaderHeight } from "../HeaderHeightProvider";
import Map from "../Map";

export const LayoutOptions = qp.schema({
  center: qp.tuple({ lat: qp.float, lng: qp.float, zoom: qp.float }, " "),
});
export type LayoutOptions = qp.Infer<typeof LayoutOptions>;

async function getMyLocation(
  signal?: AbortSignal,
): Promise<{ lat: number; lng: number }> {
  const resp = await fetch("https://ip-check-perf.radar.cloudflare.com", {
    signal,
  });
  if (!resp.ok) {
    throw resp;
  }
  const { latitude, longitude } = await resp.json();
  return { lat: latitude, lng: longitude };
}

const myLocationPromise = (async () => {
  const ctrl = new AbortController();
  setTimeout(() => {
    ctrl.abort();
  }, 1000);
  try {
    return await getMyLocation(ctrl.signal);
  } catch {
    return null;
  }
})();

function MapInner({
  events,
  layout,
  setLayout,
  filter,
  setFilter,
}: {
  events: Event[];
  layout: LayoutOptions;
  setLayout(layout: LayoutOptions): void;
  filter: FilterOptions;
  setFilter(filter: FilterOptions): void;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const selectedEvent = useMemo(() => {
    if (location.hash == "") {
      return null;
    }
    const slug = decodeURIComponent(location.hash.slice(1));
    return events.find((event) => event.id == slug) ?? null;
  }, [events, location.hash]);

  const setSelected = useCallback(
    (identifier: string) => {
      const event =
        identifier != null
          ? events.find((event) => event.id == identifier)
          : null;
      setLayout({
        ...layout,
      });
      navigate(
        {
          pathname: location.pathname,
          search: location.search,
          hash: event != null ? event.id : "",
        },
        { replace: true },
      );
    },
    [events, layout, location.pathname, location.search, navigate, setLayout],
  );

  const myLatLng = use(myLocationPromise);

  const [center] = useState(() => {
    if (layout.center != null) {
      return layout.center;
    }
    if (selectedEvent != null && selectedEvent.latLng != null) {
      const [lat, lng] = selectedEvent.latLng;
      return { lat, lng, zoom: 17 };
    }
    if (myLatLng != null) {
      const { lat, lng } = myLatLng;
      return { lat, lng, zoom: 3 };
    }
    return { lat: 0, lng: 0, zoom: 0 };
  });
  const now = useNow();

  const pred = useFilterPredicate(filter);
  const filteredEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          Temporal.ZonedDateTime.compare(now, event.endTime) < 0 && pred(event),
      ),
    [events, now, pred],
  );

  return (
    <>
      <Map
        style={{
          position: "absolute",
          height: "100%",
          top: 0,
          left: 0,
          zIndex: 0,
        }}
        selected={selectedEvent != null ? selectedEvent.id : null}
        setSelected={setSelected}
        pins={filteredEvents.flatMap((event) => {
          if (event.latLng == null) {
            return [];
          }

          const [lat, lng] = event.latLng;

          const over = Temporal.ZonedDateTime.compare(now, event.endTime) > 0;
          const active =
            Temporal.ZonedDateTime.compare(now, event.startTime) > 0 && !over;

          const variant = event.post?.viewer?.like != null ? "filled" : "light";

          return [
            {
              id: event.id,
              lat,
              lng,
              active,
              color: [
                "red",
                "orange",
                "yellow",
                "green",
                "blue",
                "indigo",
                "violet",
              ][event.startDate.dayOfWeek % 7],
              variant,
              zIndex:
                event.post?.viewer?.like != null
                  ? 3
                  : active
                    ? 2
                    : !over
                      ? 1
                      : 0,
              popup: (
                <EventRow
                  event={event}
                  showMonthInIcon
                  showLocation="break"
                  showFollowed
                  showLikeButton
                  showYear
                  density="cozy"
                  withId={false}
                />
              ),
            },
          ];
        })}
        initialCenter={center}
        setCenter={(center) => setLayout({ ...layout, center })}
      />
      {filteredEvents.length == 0 ? (
        <Center
          style={{
            position: "absolute",
            height: "100%",
            top: 0,
            left: 0,
            right: 0,
            background:
              "color-mix(in srgb, var(--mantine-color-body), transparent 50%)",
          }}
        >
          <EmptyState filter={filter} setFilter={setFilter} />
        </Center>
      ) : null}
    </>
  );
}

export default function MapView({
  events,
  layout,
  setLayout,
  filter,
  setFilter,
}: {
  events: Event[];
  layout: LayoutOptions;
  setLayout(layout: LayoutOptions): void;
  filter: FilterOptions;
  setFilter(filter: FilterOptions): void;
}) {
  const headerHeight = useHeaderHeight();

  return (
    <Box style={{ position: "relative" }}>
      <Container
        size="lg"
        px={0}
        style={{
          left: 0,
          right: 0,
          top: headerHeight,
          position: "absolute",
          zIndex: 1,
        }}
      >
        <FilterBar
          events={events}
          filledButton={true}
          filter={filter}
          setFilter={setFilter}
          rightSection={
            <>
              <LayoutSwitcher filter={filter} layoutType="map" />
            </>
          }
        />
      </Container>

      <Box h="100dvh" mt={-headerHeight}>
        <Suspense
          fallback={
            <Center p="lg" h="100%">
              <Loader />
            </Center>
          }
        >
          <MapInner
            events={events}
            layout={layout}
            setLayout={setLayout}
            filter={filter}
            setFilter={setFilter}
          />
        </Suspense>
      </Box>
    </Box>
  );
}
