import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "../api/use-session";
import { useLogin } from "../api/use-login";
import { useLogout } from "../api/use-logout";
import { useOAuthLogin } from "../api/use-oauth-login";
import { toast } from "sonner";
import { pb } from "@/lib/api/pocketbase";
import type { UsersResponse } from "@/lib/api/types/pocketbase-types";
import type { AuthMethodsList } from "pocketbase";

export interface AuthContextValue {
  user: UsersResponse | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  authMethods: AuthMethodsList | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginWithOAuth: (provider: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate();
  const { data: user, isLoading: isSessionLoading, refetch } = useSession();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const oauthLoginMutation = useOAuthLogin();
  const [authMethods, setAuthMethods] = useState<AuthMethodsList | null>(null);

  const isAuthenticated = !!user;
  const isLoading = isSessionLoading || loginMutation.isPending || logoutMutation.isPending || oauthLoginMutation.isPending;

  // Fetch available auth methods on mount
  useEffect(() => {
    pb.collection("users")
      .listAuthMethods()
      .then((methods) => {
        setAuthMethods(methods);
      })
      .catch((error) => {
        console.error("Failed to fetch auth methods:", error);
        // Set empty auth methods to indicate loading is complete
        setAuthMethods({
          password: { enabled: true, identities: [] },
          oauth2: { enabled: false, providers: [] },
          mfa: { enabled: false, duration: 0 },
          otp: { enabled: false, duration: 0 },
        });
      });
  }, []);

  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      await loginMutation.mutateAsync({ email, password, rememberMe });
      await refetch();
      toast.success("Login successful!");
      navigate({ to: "/" });
    } catch (error) {
      toast.error("Login failed. Please check your credentials.");
      throw error;
    }
  };

  const loginWithOAuth = async (provider: string) => {
    try {
      await oauthLoginMutation.mutateAsync(provider);
      await refetch();
      toast.success("Login successful!");
      navigate({ to: "/" });
    } catch (error) {
      toast.error("OAuth login failed. Please try again.");
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
      await refetch();
      toast.success("Logged out successfully");
      navigate({ to: "/signin" });
    } catch (error) {
      toast.error("Logout failed");
      throw error;
    }
  };

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated,
    authMethods,
    login,
    loginWithOAuth,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
