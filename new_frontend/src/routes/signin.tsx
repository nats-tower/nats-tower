import { createFileRoute, redirect } from "@tanstack/react-router";
import { SignInForm } from "@/features/auth/components/SignInForm";
import { pb } from "@/lib/api/pocketbase";

export const Route = createFileRoute("/signin")({
  beforeLoad: async () => {
    // If already authenticated, redirect to home
    if (pb.authStore.isValid) {
      throw redirect({ to: "/" });
    }
  },
  component: SignInPage,
});

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <SignInForm />
    </div>
  );
}
