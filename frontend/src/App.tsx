/**
 * Main App Component
 * Root component with providers and router
 */
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { PendingCartProvider } from "./context/PendingCartContext";
import { CampaignProvider } from "./context/CampaignContext";
import { store } from "./store";
import router from "./routes";

function App(): React.ReactElement {
  return (
    <Provider store={store}>
      <AuthProvider>
        <PendingCartProvider>
          <CampaignProvider>
            <RouterProvider router={router} />
          </CampaignProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "var(--color-surface)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
              },
              success: {
                iconTheme: {
                  primary: "var(--color-success)",
                  secondary: "white",
                },
              },
              error: {
                iconTheme: {
                  primary: "var(--color-error)",
                  secondary: "white",
                },
              },
            }}
          />
          {/* The floating chat widget is rendered by the router's root route
              (components/layout/AppShell.tsx) so it can use links */}
        </PendingCartProvider>
      </AuthProvider>
    </Provider>
  );
}

export default App;
