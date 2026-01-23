import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "../api/use-session";
import { useLogin } from "../api/use-login";
import { useLogout } from "../api/use-logout";
import { useOAuthLogin } from "../api/use-oauth-login";
import { pb } from "@/lib/api/pocketbase";
import { UsersResponse } from "@/lib/api/types/pocketbase-types";
import type { AuthMethodsList } from "pocketbase";

export interface AuthContextType {
  user: UsersResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: ReturnType<typeof useLogin>["mutate"];
  loginAsync: ReturnType<typeof useLogin>["mutateAsync"];
  logout: () => void;
  loginWithOAuth: (provider: string) => void;
  authMethods: AuthMethodsList | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading: isSessionLoading } = useSession();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const oauthLoginMutation = useOAuthLogin();
  const [authMethods, setAuthMethods] = useState<AuthMethodsList | null>(null);

  useEffect(() => {
    // Fetch auth methods
    pb.collection("users").listAuthMethods().then((methods) => {
      setAuthMethods(methods);
    }).catch((err) => {
      console.error("Failed to fetch auth methods:", err);
    });
  }, []);

  const value = {
    user: user ?? null,
    isAuthenticated: !!user,
    isLoading: isSessionLoading,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    logout: () => logoutMutation.mutate(),
    loginWithOAuth: (provider: string) => oauthLoginMutation.mutate({ provider }),
    authMethods,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
