'use client';
import Link from 'next/link';

export default function Layer1USPage() {
  return (
    <div 
      className="bg-[#050505] min-h-screen text-white antialiased selection:bg-[#06B6D4] selection:text-black flex flex-col"
      style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(6, 182, 212, 0.04) 0%, transparent 40%), radial-gradient(circle at bottom left, rgba(212, 175, 55, 0.02) 0%, transparent 40%)' }}
    >
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-12">
            <Link href="/router" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-[#06B6D4] rounded flex items-center justify-center text-black font-black text-lg">W</div>
              <span className="text-xs font-black uppercase tracking-[0.4em] text-white">Wising Intelligence</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Workspace: Layer 1 US</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-16 flex flex-col justify-center items-center text-center">
        <div className="border border-white/5 bg-[#0a0a0a] rounded-3xl p-12 max-w-2xl w-full shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#06B6D4] to-transparent"></div>
          
          <div className="w-16 h-16 rounded-full bg-[#06B6D4]/10 text-[#06B6D4] flex items-center justify-center mb-6 mx-auto">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight mb-4">
            Layer 1 US Specialist
          </h1>
          <p className="text-white/60 mb-8 max-w-md mx-auto leading-relaxed">
            This is the workspace for US Tax Compliance and Residency Evaluation. The Layer 1 US module is currently in development.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
            <Link 
              href="/router" 
              className="py-3 px-6 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all"
            >
              ← Back to Router
            </Link>
            <button 
              onClick={() => alert('US data layer connected!')}
              className="py-3 px-6 bg-[#06B6D4] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:brightness-110 transition-all shadow-lg shadow-[#06B6D4]/10"
            >
              Validate Connection
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
