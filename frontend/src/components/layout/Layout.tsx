/**
 * Main Layout Component
 * Wraps pages with header and footer
 */
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import AuthPromptModal from "../ui/AuthPromptModal";

const Layout = (): React.ReactElement => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <AuthPromptModal />
    </div>
  );
};

export default Layout;
