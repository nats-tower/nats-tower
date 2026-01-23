import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/features/auth/lib/auth-context";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Outlet />
        </div>
        <Toaster />
        <TanStackRouterDevtools position="bottom-right" />
      </AuthProvider>
    </ThemeProvider>
  );
}
