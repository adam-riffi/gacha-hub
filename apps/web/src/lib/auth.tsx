import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Me } from "./types";

interface AuthValue {
  me: Me | null;
  loading: boolean;
  devLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<Me>("/api/me"),
  });

  const value: AuthValue = {
    me: data ?? null,
    loading: isLoading,
    devLogin: async () => {
      await api.post("/api/auth/dev-login");
      await qc.invalidateQueries();
    },
    logout: async () => {
      await api.post("/api/auth/logout");
      await qc.invalidateQueries();
    },
    refresh: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
