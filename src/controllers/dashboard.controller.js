import { getDashboardSummary } from '../services/dashboardAnalytics.service.js';

export async function fetchDashboardSummary(req, res) {
  try {
    const summary = await getDashboardSummary();
    return res.status(200).json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch dashboard summary';
    return res.status(500).json({ error: message });
  }
}
