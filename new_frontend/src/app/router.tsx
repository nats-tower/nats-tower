import { createRouter } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen";

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  context: {
    auth: undefined!, // This will be injected in main.tsx
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
