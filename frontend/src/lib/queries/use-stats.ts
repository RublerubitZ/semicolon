import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

async function fetchJson(endpoint: string) {
  const res = await apiGet(endpoint);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function useHeatmap(year: number) {
  return useQuery({
    queryKey: ['heatmap', year],
    queryFn: () => fetchJson(`/api/mentee/heatmap?year=${year}`),
    staleTime: 10 * 60 * 1000,
  });
}

export function useWeeklyRanking() {
  return useQuery({
    queryKey: ['ranking', 'weekly'],
    queryFn: () => fetchJson('/api/mentee/ranking'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useStreak() {
  return useQuery({
    queryKey: ['streak'],
    queryFn: () => fetchJson('/api/mentee/streak'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMentorDashboard(menteeId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['mentor', 'dashboard', menteeId, year, month],
    queryFn: () => fetchJson(`/api/mentor/mentees/${menteeId}/stats/dashboard?year=${year}&month=${month}`),
    enabled: !!menteeId && !!year && !!month,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMentorTrends(menteeId: string, months: number = 6) {
  return useQuery({
    queryKey: ['mentor', 'trends', menteeId, months],
    queryFn: () => fetchJson(`/api/reports/trends?menteeId=${menteeId}&months=${months}`),
    enabled: !!menteeId,
    staleTime: 10 * 60 * 1000,
  });
}
