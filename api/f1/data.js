// Vercel Serverless Function — OpenF1 API Proxy
// GET /api/f1/data?endpoint=sessions&year=2025
import { handleCors } from '../_utils/security.js';

const OPENF1_BASE = 'https://api.openf1.org/v1';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { endpoint, ...params } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'endpoint parameter required' });
  }

  // Whitelist allowed endpoints
  const allowed = ['sessions', 'drivers', 'position', 'laps', 'meetings'];
  if (!allowed.includes(endpoint)) {
    return res.status(400).json({ error: `Invalid endpoint: ${endpoint}` });
  }

  try {
    const qs = new URLSearchParams(params).toString();
    const url = `${OPENF1_BASE}/${endpoint}${qs ? `?${qs}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenF1 responded with ${response.status}`);
    }

    const data = await response.json();

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(data);
  } catch (error) {
    console.error('OpenF1 proxy error:', error);
    return res.status(502).json({ error: 'Failed to fetch from OpenF1' });
  }
}
