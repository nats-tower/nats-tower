import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "../api/use-session";
import { useLogin } from "../api/use-login";
import { useLogout } from "../api/use-logout";
import { toast } from "sonner";
import type { UsersResponse } from "@/lib/api/types/pocketbase-types";

export interface AuthContextValue {
  user: UsersResponse | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
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

  const isAuthenticated = !!user;
  const isLoading = isSessionLoading || loginMutation.isPending || logoutMutation.isPending;

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
    login,
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
