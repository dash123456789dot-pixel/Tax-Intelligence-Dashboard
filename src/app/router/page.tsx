import RouterShell from '@/components/router/RouterShell';

export const metadata = {
  title: 'WISING Wealth Intelligence - Jurisdiction Router',
  description: 'Layer 0 Router to determine tax jurisdiction (India/US/Dual/None)',
};

export default function RouterPage() {
  return <RouterShell />;
}
