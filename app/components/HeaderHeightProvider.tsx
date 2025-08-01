import { createContext, use } from "react";

const HeaderHeightContext = createContext(61);

export function useHeaderHeight() {
  return use(HeaderHeightContext);
}

export const HeaderHeightProvider = HeaderHeightContext.Provider;
