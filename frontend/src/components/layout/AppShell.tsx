/**
 * Root route element: every page (storefront and admin) plus the floating
 * chat widget. The widget lives here — inside the router — so chat UI can use
 * links and navigation (e.g. the guest form's "Sign in" link). Also records
 * page views for the admin Visitors page (admin pages are never counted).
 */
import { Outlet } from "react-router-dom";
import { ChatWidget } from "../chat";
import { usePageViews } from "../../hooks/usePageViews";

const AppShell = () => {
  usePageViews();
  return (
    <>
      <Outlet />
      <ChatWidget />
    </>
  );
};

export default AppShell;
