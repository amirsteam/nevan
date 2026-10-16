/**
 * Records a page view (utils/analytics) whenever the route's path changes.
 * Mounted once by the root route (components/layout/AppShell.tsx).
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { track } from "../utils/analytics";

export const usePageViews = (): void => {
  const { pathname } = useLocation();
  useEffect(() => {
    track("page_view", { path: pathname });
  }, [pathname]);
};
