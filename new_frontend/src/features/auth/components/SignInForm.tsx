import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "../lib/auth-context";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { pb } from "@/lib/api/pocketbase";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type SignInFormData = z.infer<typeof signInSchema>;

export function SignInForm() {
  const { login, loginWithOAuth, isLoading, authMethods } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPasswordSignIn, setShowPasswordSignIn] = useState(false);

  // Determine auth method availability
  const hasPasswordAuth = !!authMethods?.password?.enabled;
  const hasSocialAuth = !!authMethods?.oauth2?.providers?.length;
  const isLoadingAuthMethods = authMethods === null;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const rememberMe = watch("rememberMe");

  const onSubmit = async (data: SignInFormData) => {
    setError(null);
    try {
      await login(data.email, data.password, data.rememberMe);
    } catch {
      setError("Invalid email or password. Please try again.");
    }
  };

  const handleOAuthLogin = async (provider: string) => {
    setError(null);
    try {
      await loginWithOAuth(provider);
    } catch {
      setError("OAuth login failed. Please try again.");
    }
  };

  // Show password form by default if no social auth or still loading
  const shouldShowPasswordForm = isLoadingAuthMethods || !hasSocialAuth || showPasswordSignIn;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          {isLoadingAuthMethods
            ? "Loading sign-in options..."
            : hasSocialAuth && !showPasswordSignIn
              ? "Sign in with one of the following providers"
              : "Enter your credentials to access your account"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show loading state while fetching auth methods */}
        {isLoadingAuthMethods && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* OAuth Providers */}
        {!isLoadingAuthMethods && hasSocialAuth && authMethods?.oauth2?.providers?.map((provider) => (
          <Button
            key={provider.name}
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthLogin(provider.name)}
            disabled={isLoading}
          >
            <img
              src={`${pb.baseURL}_/images/oauth2/${provider.name}.svg`}
              className="h-4 w-4 mr-2"
              alt={`${provider.displayName} logo`}
            />
            Sign in with {provider.displayName}
          </Button>
        ))}

        {/* Separator between OAuth and password auth */}
        {!isLoadingAuthMethods && hasPasswordAuth && hasSocialAuth && <Separator />}

        {/* Toggle to show password form when OAuth is available */}
        {!isLoadingAuthMethods && hasSocialAuth && !showPasswordSignIn && hasPasswordAuth && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowPasswordSignIn(true)}
            disabled={isLoading}
          >
            Use email and password to sign in
          </Button>
        )}

        {/* Password Sign-In Form */}
        {!isLoadingAuthMethods && hasPasswordAuth && shouldShowPasswordForm && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setValue("rememberMe", checked === true)}
                disabled={isLoading}
              />
              <Label
                htmlFor="rememberMe"
                className="text-sm font-normal cursor-pointer"
              >
                Remember me
              </Label>
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        )}

        {/* General error message for OAuth */}
        {!isLoadingAuthMethods && !hasPasswordAuth && error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
