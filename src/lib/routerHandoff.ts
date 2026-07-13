export type RouterHandoffData = {
  full_name?: string | null;
  date_of_birth?: string | null;
  india: {
    india_days?: number | null;
    liable_to_tax_in_another_country?: boolean | null;
  };
  us: {
    us_days?: number | null;
  };
};

export function readRouterHandoff(): RouterHandoffData | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem('wising_router_state');
    if (!data) return null;
    return JSON.parse(data) as RouterHandoffData;
  } catch (e) {
    console.error('Failed to parse router handoff data:', e);
    return null;
  }
}
