import { redirect } from "@tanstack/react-router";
import { AuthContextType } from "./auth-context";

interface RouterContext {
  auth: AuthContextType;
}

export const requireAuth = ({ context, location }: { context: RouterContext; location: { href: string } }) => {
  if (!context.auth.isAuthenticated) {
    throw redirect({
      to: "/signin",
      search: {
        redirect: location.href,
      },
    });
  }
};
