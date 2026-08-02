"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";

interface AuthContextType {
  token: string | null;
  userId: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      try {
        const decoded: any = jwtDecode(storedToken);
        const uId = decoded.sub || decoded.username || "admin-01";
        setUserId(uId);
        sessionStorage.setItem("userId", uId);
      } catch (e) {
        console.error("Invalid token", e);
      }
    }
  }, []);

  const login = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem("token", newToken);
    try {
      const decoded: any = jwtDecode(newToken);
      const uId = decoded.sub || decoded.username || "admin-01";
      setUserId(uId);
      sessionStorage.setItem("userId", uId);
    } catch (e) {
      console.error("Invalid token", e);
    }
    router.push("/router");
  };

  const logout = () => {
    setToken(null);
    setUserId(null);
    localStorage.removeItem("token");
    sessionStorage.removeItem("userId");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ token, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
