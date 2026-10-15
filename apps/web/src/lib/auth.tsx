import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Me } from "./types";

interface AuthValue {
  currentUser: Me | null;
  loading: boolean;
  devLogin: () => Promise<void>;
  /** Signs the owner in with the owner password (ADR 0010); throws the API's error (401 wrong, 429 too many tries). */
  passwordLogin: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<Me>("/api/me"),
  });

  const value: AuthValue = {
    currentUser: data ?? null,
    loading: isLoading,
    devLogin: async () => {
      await api.post("/api/auth/dev-login");
      await queryClient.invalidateQueries();
    },
    passwordLogin: async (password) => {
      await api.post("/api/auth/password", { password });
      await queryClient.invalidateQueries();
    },
    logout: async () => {
      await api.post("/api/auth/logout");
      await queryClient.invalidateQueries();
    },
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
