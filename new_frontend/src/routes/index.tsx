import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: IndexComponent,
});

function IndexComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">NATS Tower</h1>
        <p className="text-muted-foreground text-lg">
          Welcome to the new frontend
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          Built with React, Vite, TanStack Router, TanStack Query, and shadcn/ui
        </p>
      </div>
    </div>
  );
}
