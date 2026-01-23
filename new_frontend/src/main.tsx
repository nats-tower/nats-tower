import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { router } from "./app/router";
import { queryClient } from "./lib/api/query-client";
import "./styles/globals.css";
import { AuthProvider, useAuth } from "./features/auth/lib/auth-context";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = ReactDOM.createRoot(rootElement);

// eslint-disable-next-line react-refresh/only-export-components
function App() {
  const auth = useAuth();
  return <RouterProvider router={router} context={{ auth }} />;
}

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
