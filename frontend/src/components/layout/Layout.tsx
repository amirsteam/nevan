/**
 * Main Layout Component
 * Wraps pages with header and footer
 */
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import AuthPromptModal from "../ui/AuthPromptModal";
import ScrollToTop from "./ScrollToTop";

const Layout = (): React.ReactElement => {
  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--color-primary)] focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <Header />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <AuthPromptModal />
    </div>
  );
};

export default Layout;
