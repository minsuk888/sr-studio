const API_BASE = import.meta.env.DEV ? '' : '';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

async function fetchF1(endpoint, params = {}) {
  const qs = new URLSearchParams({ endpoint, ...params }).toString();
  const cacheKey = qs;

  const cached = getCached(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${API_BASE}/api/f1/data?${qs}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'F1 데이터 로드 실패');
  }

  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}

export const f1Service = {
  // Get current or recent session meetings (race weekends)
  async getMeetings(year) {
    const currentYear = year || new Date().getFullYear();
    return fetchF1('meetings', { year: currentYear });
  },

  // Get sessions for a meeting (FP1, FP2, FP3, Quali, Race)
  async getSessions(meetingKey) {
    return fetchF1('sessions', { meeting_key: meetingKey });
  },

  // Get driver standings for a session
  async getDrivers(sessionKey) {
    return fetchF1('drivers', { session_key: sessionKey });
  },

  // Get final positions for a session
  async getPositions(sessionKey) {
    const data = await fetchF1('position', { session_key: sessionKey });
    // Return only the latest position per driver
    const latest = new Map();
    for (const pos of data) {
      latest.set(pos.driver_number, pos);
    }
    return [...latest.values()].sort((a, b) => a.position - b.position);
  },

  // Clear all cached data
  clearCache() {
    cache.clear();
  },
};
