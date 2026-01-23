import { createFileRoute, useRouter } from "@tanstack/react-router";
import { SignInForm } from "@/features/auth/components/SignInForm";
import { useAuth } from "@/features/auth/lib/auth-context";
import { useEffect } from "react";
import { z } from "zod";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/signin")({
  component: SignInPage,
  validateSearch: (search) => searchSchema.parse(search),
});

function SignInPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const search = Route.useSearch();

  useEffect(() => {
    if (isAuthenticated) {
      if (search.redirect) {
        if (search.redirect.startsWith("/")) {
             router.navigate({ to: search.redirect });
        } else {
             window.location.href = search.redirect;
        }
      } else {
        router.navigate({ to: "/" });
      }
    }
  }, [isAuthenticated, router, search.redirect]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <SignInForm />
    </div>
  );
}
