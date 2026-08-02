"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from "jwt-decode";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            localStorage.removeItem("token");
            sessionStorage.removeItem("userId");
            router.replace('/login');
          } else {
            router.replace('/router');
          }
        } catch (e) {
          localStorage.removeItem("token");
          sessionStorage.removeItem("userId");
          router.replace('/login');
        }
      } else {
        router.replace('/login');
      }
    };
    
    checkToken();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
      <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
