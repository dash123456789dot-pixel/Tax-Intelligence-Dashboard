import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
global.fetch = fetchMock;

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ user_id: 'test-uuid', cookie_id: 'c' }),
  });
});

describe('useRouterMachine persistence wiring', () => {
  it('calls /api/session/init on mount', async () => {
    // Render the hook (using @testing-library/react renderHook)
    // ... mount logic ...
    const calls = fetchMock.mock.calls.map((c) => c[0]);
    expect(calls.some((url: string) => url.includes('/api/session/init'))).toBe(true);
  });

  it('debounce-POSTs to /api/router-cache on context change', async () => {
    // ... trigger a SET_BOOL event, wait for debounce ...
    const cacheCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes('/api/router-cache'));
    expect(cacheCalls.length).toBeGreaterThan(0);
  });

  it('POSTs to /api/router-persist when isComplete becomes true', async () => {
    // ... advance machine to complete ...
    const persistCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes('/api/router-persist'));
    expect(persistCalls.length).toBe(1);
  });

  it('POSTs to /api/session/logout on reset', async () => {
    // ... send RESET ...
    const logoutCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes('/api/session/logout'));
    expect(logoutCalls.length).toBe(1);
  });

  it('does NOT persist to Postgres before isComplete', async () => {
    // ... set a few fields but do not complete ...
    const persistCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes('/api/router-persist'));
    expect(persistCalls.length).toBe(0);
  });
});