'use client';
import { useState, useRef, useEffect } from 'react';

export default function RouterNav() {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-md border-b border-white/5">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-4 lg:space-x-12">
          <div 
            id="nav-trigger-zone" 
            className="relative group py-6 -my-6 cursor-pointer"
            onMouseEnter={handleMouseEnter} /* mouseenter */
            onMouseLeave={handleMouseLeave}
          >
            <button className="text-white flex flex-col justify-center items-start gap-1.5 focus:outline-none">
              <span className="w-6 h-[2px] bg-current rounded-full"></span>
              <span className="w-4 h-[2px] bg-current rounded-full transition-all group-hover:w-6"></span>
              <span className="w-6 h-[2px] bg-current rounded-full"></span>
            </button>
            {/* Sidebar Menu Drawer */}
            <div 
              id="sidebar-menu" 
              className={`fixed left-0 top-20 bottom-0 w-80 bg-black transition-all duration-300 z-50 border-r border-white/5 ${isOpen ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'}`}
            >
              <div className="flex flex-col text-[11px] font-bold tracking-[0.15em] uppercase text-white/50 pt-6">
                <a href="#" className="flex items-center px-10 py-5 hover:bg-white/5 transition-colors">Tax Intelligence</a>
                <a href="#" className="flex items-center px-10 py-5 hover:bg-white/5 transition-colors">Salaries & RSUs</a>
                <a href="#" className="flex items-center px-10 py-5 bg-[#111] text-white border-l-4 border-white transition-colors">Jurisdiction Router</a>
              </div>
            </div>
          </div>
          <a href="#" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 shrink-0 bg-brandGold rounded flex items-center justify-center text-black font-black text-lg">W</div>
            <span className="hidden sm:inline text-xs font-black uppercase tracking-[0.4em] text-white">Wising Intelligence</span>
          </a>
        </div>
        <div className="flex items-center space-x-4 lg:space-x-8">
          <div className="hidden sm:flex items-center space-x-4">
            <span className="w-2 h-2 rounded-full bg-brandGreen animate-pulse"></span>
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Router Mode: Active</span>
          </div>
          <div className="hidden sm:block w-px h-6 bg-white/10"></div>
          <button className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </button>
        </div>
      </div>
    </header>
  );
}
