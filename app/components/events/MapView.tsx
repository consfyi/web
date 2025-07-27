import { Box, Center, Container, Loader } from "@mantine/core";
import { getDay, isAfter } from "date-fns";
import { Suspense, use, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { type EventWithPost, useNow } from "~/hooks";
import * as qp from "~/qp";
import EventRow from "../EventRow";
import EmptyState from "../EmptyState";
import FilterBar, {
  FilterOptions,
  LayoutSwitcher,
  useFilterPredicate,
} from "../FilterBar";
import Map from "../Map";

export const LayoutOptions = qp.schema({
  center: qp.tuple({ lat: qp.float, lng: qp.float, zoom: qp.float }, " "),
});
export type LayoutOptions = qp.Infer<typeof LayoutOptions>;

async function getMyLocation(
  signal?: AbortSignal,
): Promise<{ lat: number; lng: number }> {
  const resp = await fetch("https://free.freeipapi.com/api/json", {
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
  events: EventWithPost[];
  layout: LayoutOptions;
  setLayout(layout: LayoutOptions): void;
  filter: FilterOptions;
  setFilter(filter: FilterOptions): void;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const slug = location.hash != "" ? location.hash.slice(1) : null;

  const selected = useMemo(
    () =>
      slug != null ? (events.find((event) => event.id == slug) ?? null) : null,
    [slug, events],
  );

  const myLatLng = use(myLocationPromise);

  const [center] = useState(() => {
    if (layout.center != null) {
      return layout.center;
    }
    if (selected != null && selected.latLng != null) {
      const [lat, lng] = selected.latLng;
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
  const filteredEvents = events.filter(pred);

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
        selected={selected != null ? selected.id : null}
        setSelected={(identifier) => {
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
        }}
        pins={filteredEvents.flatMap((event) => {
          if (event.latLng == null) {
            return [];
          }

          const [lat, lng] = event.latLng;
          const active = isAfter(now, event.start) && !isAfter(now, event.end);

          const color = [
            "red",
            "orange",
            "yellow",
            "green",
            "blue",
            "indigo",
            "violet",
          ][getDay(event.start)];

          const variant =
            event.post.viewer != null && event.post.viewer.like != null
              ? "filled"
              : "light";

          return [
            {
              id: event.id,
              lat,
              lng,
              active,
              color,
              variant,
              zIndex:
                event.post.viewer != null && event.post.viewer.like != null
                  ? 2
                  : active
                    ? 1
                    : 0,
              popup: (
                <EventRow
                  event={event}
                  showMonthInIcon
                  showEndDateOnly={false}
                  showLocation="break"
                  showFollowed
                  showLikeButton
                  density="cozy"
                  showDuration={false}
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
  events: EventWithPost[];
  layout: LayoutOptions;
  setLayout(layout: LayoutOptions): void;
  filter: FilterOptions;
  setFilter(filter: FilterOptions): void;
}) {
  return (
    <Box style={{ position: "relative" }}>
      <Container
        size="lg"
        px={0}
        style={{
          left: 0,
          right: 0,
          top: 50,
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

      <Box h="100dvh" mt={-50}>
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
