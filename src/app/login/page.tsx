"use client";

import { useState } from "react";
import { useAuth } from "../../components/AuthContext";
import { Lock, User, Mail, ArrowRight, XCircle } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isLogin) {
        // Login Flow
        const response = await fetch("http://localhost:8000/api/v1/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            username,
            password,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          login(data.access_token);
        } else {
          setError("Invalid credentials");
        }
      } else {
        // Signup Flow
        const response = await fetch("http://localhost:8000/api/v1/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            email,
            password,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          login(data.access_token);
        } else {
          const errData = await response.json();
          setError(errData.detail || "Registration failed");
        }
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] font-sans selection:bg-[#D4AF37] selection:text-black">
      {/* Background decorations for that premium feel */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md p-8 bg-[#121212]/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Top gold line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />

        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-white tracking-tight uppercase font-outfit">
            Wising <span className="text-[#D4AF37]">Tax</span>
          </h2>
          <p className="text-xs text-white/40 uppercase tracking-widest mt-2 font-medium">
            Intelligence Dashboard
          </p>
        </div>

        {/* Switcher */}
        <div className="flex p-1 bg-white/5 rounded-lg mb-8">
          <button
            onClick={() => { setIsLogin(true); setError(""); }}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-300 ${
              isLogin 
                ? "bg-[#D4AF37] text-black shadow-lg" 
                : "text-white/50 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(""); }}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-300 ${
              !isLogin 
                ? "bg-[#D4AF37] text-black shadow-lg" 
                : "text-white/50 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-6 bg-red-900/20 border border-red-500/20 rounded-lg text-red-400 text-xs font-medium animate-in fade-in slide-in-from-top-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 ml-1">Username</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="w-4 h-4 text-white/30 group-focus-within:text-[#D4AF37] transition-colors" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:border-[#D4AF37]/50 focus:bg-black focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all duration-200"
                required
              />
            </div>
          </div>

          {/* Email Field (Signup Only) */}
          {!isLogin && (
            <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 ml-1">Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-white/30 group-focus-within:text-[#D4AF37] transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:border-[#D4AF37]/50 focus:bg-black focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all duration-200"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 ml-1">Password</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-white/30 group-focus-within:text-[#D4AF37] transition-colors" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:border-[#D4AF37]/50 focus:bg-black focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all duration-200"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#c4a030] text-black py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <span>{isLogin ? "Sign In" : "Create Account"}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
