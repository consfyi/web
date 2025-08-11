import { Center, Loader } from "@mantine/core";
import {
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router";
import SimpleErrorBoundary from "~/components/SimpleErrorBoundary";
import { type Event, useIsLoggedIn } from "~/hooks";
import * as qp from "~/qp";
import { FilterOptions } from "./FilterBar";
import { useGlobalSearch } from "./GlobalSearchContext";

export default function EventsListPage<T extends qp.Schema>({
  events,
  LayoutOptions,
  Component,
}: {
  events: Event[];
  LayoutOptions: T;
  Component(props: {
    events: Event[];
    layout: qp.Infer<typeof LayoutOptions>;
    setLayout(layout: qp.Infer<typeof LayoutOptions>): void;
    filter: FilterOptions;
    setFilter(filter: FilterOptions): void;
  }): ReactNode;
}) {
  const isLoggedIn = useIsLoggedIn();

  const navigate = useNavigate();
  const location = useLocation();

  const { query } = useGlobalSearch();

  const pendingView = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      filter: qp.parse(FilterOptions, searchParams),
      layout: qp.parse(LayoutOptions, searchParams),
    };
  }, [location.search, LayoutOptions]);

  const [viewInternal, setViewInternal] = useState<{
    filter: FilterOptions;
    layout: qp.Infer<typeof LayoutOptions>;
  }>(pendingView);

  useEffect(() => {
    setViewInternal(pendingView);
  }, [pendingView]);

  const setView = useCallback(
    (view: typeof viewInternal) => {
      setViewInternal(view);

      const searchParams = new URLSearchParams();
      qp.serialize(FilterOptions, view.filter, searchParams);
      qp.serialize(LayoutOptions, view.layout, searchParams);

      navigate(
        {
          pathname: location.pathname,
          hash: location.hash,
          search: searchParams.toString(),
        },
        { replace: true },
      );
    },
    [LayoutOptions, location, navigate],
  );

  const view = viewInternal;

  useEffect(() => {
    if (query == view.filter.q) {
      return;
    }
    setView({
      ...view,
      filter: { ...view.filter, q: query },
    });
  }, [query, view, setView]);

  return (
    <>
      <SimpleErrorBoundary>
        <Suspense
          fallback={
            <Center p="lg">
              <Loader />
            </Center>
          }
        >
          <Component
            events={events}
            filter={{
              ...view.filter,
              going: isLoggedIn && view.filter.going,
              followed: isLoggedIn && view.filter.followed,
            }}
            setFilter={(filter) => {
              setView({ ...view, filter });
            }}
            layout={view.layout}
            setLayout={(layout) => {
              setView({ ...view, layout });
            }}
          />
        </Suspense>
      </SimpleErrorBoundary>
    </>
  );
}
