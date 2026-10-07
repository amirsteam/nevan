/**
 * Main Layout Component
 * Wraps pages with header and footer
 */
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import AuthPromptModal from "../ui/AuthPromptModal";
import ScrollToTop from "./ScrollToTop";
import CartSync from "./CartSync";
import PendingCartSync from "./PendingCartSync";
import AnnouncementBar from "../campaign/AnnouncementBar";

const Layout = (): React.ReactElement => {
  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--color-primary)] focus:text-[var(--color-on-primary)] focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <CartSync />
      <PendingCartSync />
      <AnnouncementBar />
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
      <AuthPromptModal />
    </div>
  );
};

export default Layout;
