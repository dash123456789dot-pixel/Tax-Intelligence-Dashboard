'use client';
import { useRouterMachine } from '@/hooks/useRouterMachine';
import RouterNav from './RouterNav';
import RouterCard from './RouterCard';
import RouterDebugPanel from './RouterDebugPanel';

export default function RouterShell() {
  const machine = useRouterMachine();
  return (
    <div 
      id="dashboard-shell" 
      className="bg-[#050505] min-h-screen text-white antialiased selection:bg-brandGold selection:text-black"
      style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(212, 175, 55, 0.03) 0%, transparent 40%), radial-gradient(circle at bottom left, rgba(6, 182, 212, 0.02) 0%, transparent 40%)' }}
    >
      <RouterNav />
      <main className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6 lg:py-16 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <RouterCard machine={machine} />
      </main>
      <RouterDebugPanel machine={machine} />
    </div>
  );
}
