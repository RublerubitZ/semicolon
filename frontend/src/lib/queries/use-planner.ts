import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

async function fetchJson(endpoint: string) {
  const res = await apiGet(endpoint);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function useDailyPlanner(date: string) {
  return useQuery({
    queryKey: ['planner', 'daily', date],
    queryFn: () => fetchJson(`/api/mentee/planner/daily?date=${date}`),
    enabled: !!date,
    staleTime: 60 * 1000, // 1분
  });
}

export function useWeeklyPlanner(startDate: string) {
  return useQuery({
    queryKey: ['planner', 'weekly', startDate],
    queryFn: () => fetchJson(`/api/mentee/planner/weekly?startDate=${startDate}`),
    enabled: !!startDate,
    staleTime: 60 * 1000,
  });
}

export function useMonthlyPlanner(year: number, month: number) {
  return useQuery({
    queryKey: ['planner', 'monthly', year, month],
    queryFn: () => fetchJson(`/api/mentee/planner/monthly?year=${year}&month=${month}`),
    enabled: !!year && !!month,
    staleTime: 2 * 60 * 1000, // 2분
  });
}
