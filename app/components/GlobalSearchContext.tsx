import { createContext, useContext, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import * as qp from "~/qp";

export const GlobalSearchContext = createContext<{
  query: string;
  setQuery(query: string): void;
} | null>(null);

const GlobalSearchSchema = qp.schema({
  q: qp.default_(qp.string, ""),
});

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [query, setQuery] = useState<string>(() => {
    const searchParams = new URLSearchParams(location.search);
    return qp.parse(GlobalSearchSchema, searchParams).q;
  });

  return (
    <GlobalSearchContext.Provider
      value={{
        query,
        setQuery,
      }}
    >
      {children}
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalQuery() {
  return useContext(GlobalSearchContext)!.query;
}

export function useClearGlobalQuery() {
  const { setQuery } = useContext(GlobalSearchContext)!;
  return () => {
    setQuery("");
  };
}
