/**
 * Root route element: every page (storefront and admin) plus the floating
 * chat widget. The widget lives here — inside the router — so chat UI can use
 * links and navigation (e.g. the guest form's "Sign in" link).
 */
import { Outlet } from "react-router-dom";
import { ChatWidget } from "../chat";

const AppShell = () => (
  <>
    <Outlet />
    <ChatWidget />
  </>
);

export default AppShell;
