"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { jwtDecode } from "jwt-decode";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("No token found, redirecting to login");
        router.replace("/login");
        return;
      }

      try {
        const decoded: any = jwtDecode(token);
        // Check if token is expired (if exp claim exists)
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          console.warn("Token expired, redirecting to login");
          localStorage.removeItem("token");
          sessionStorage.removeItem("userId");
          router.replace("/login");
          return;
        }
        setIsAuthorized(true);
      } catch (e) {
        console.error("Invalid token format, redirecting to login", e);
        localStorage.removeItem("token");
        sessionStorage.removeItem("userId");
        router.replace("/login");
      }
    };

    checkAuth();
  }, [pathname, router]);

  if (!isAuthorized) {
    // Show a loading spinner while checking auth
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
