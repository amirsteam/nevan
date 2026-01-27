/**
 * Main App Component
 * Root component with providers and router
 */
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { PendingCartProvider } from "./context/PendingCartContext";
import { store } from "./store";
import router from "./routes";

function App(): React.ReactElement {
  return (
    <Provider store={store}>
      <AuthProvider>
        <PendingCartProvider>
          <RouterProvider router={router} />
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
        </PendingCartProvider>
      </AuthProvider>
    </Provider>
  );
}

export default App;
