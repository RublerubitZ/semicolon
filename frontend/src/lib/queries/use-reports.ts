import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

async function fetchJson(endpoint: string) {
  const res = await apiGet(endpoint);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function useWeeklyReportData(startDate: string, prevStartDate: string) {
  const currentQuery = useQuery({
    queryKey: ['report', 'weekly', 'current', startDate],
    queryFn: () => fetchJson(`/api/mentee/planner/weekly?startDate=${startDate}`),
    enabled: !!startDate,
    staleTime: 5 * 60 * 1000,
  });

  const prevQuery = useQuery({
    queryKey: ['report', 'weekly', 'prev', prevStartDate],
    queryFn: () => fetchJson(`/api/mentee/planner/weekly?startDate=${prevStartDate}`),
    enabled: !!prevStartDate,
    staleTime: 5 * 60 * 1000,
  });

  return {
    currentData: currentQuery.data,
    prevData: prevQuery.data,
    isLoading: currentQuery.isLoading || prevQuery.isLoading,
    error: currentQuery.error || prevQuery.error,
  };
}

export function useMonthlyReportData(year: number, month: number) {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const currentQuery = useQuery({
    queryKey: ['report', 'monthly', 'current', year, month],
    queryFn: () => fetchJson(`/api/mentee/planner/monthly?year=${year}&month=${month}`),
    enabled: !!year && !!month,
    staleTime: 5 * 60 * 1000,
  });

  const prevQuery = useQuery({
    queryKey: ['report', 'monthly', 'prev', prevYear, prevMonth],
    queryFn: () => fetchJson(`/api/mentee/planner/monthly?year=${prevYear}&month=${prevMonth}`),
    enabled: !!year && !!month,
    staleTime: 5 * 60 * 1000,
  });

  return {
    currentData: currentQuery.data,
    prevData: prevQuery.data,
    isLoading: currentQuery.isLoading || prevQuery.isLoading,
    error: currentQuery.error || prevQuery.error,
  };
}

export function useWeeklyFeedback(year: number, month: number, weekNumber: number) {
  return useQuery({
    queryKey: ['feedback', 'weekly', year, month, weekNumber],
    queryFn: () => fetchJson(`/api/mentee/weekly-feedbacks?year=${year}&month=${month}&weekNumber=${weekNumber}`),
    enabled: !!year && !!month && !!weekNumber,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMonthlyFeedback(year: number, month: number) {
  return useQuery({
    queryKey: ['feedback', 'monthly', year, month],
    queryFn: () => fetchJson(`/api/mentee/monthly-feedbacks?year=${year}&month=${month}`),
    enabled: !!year && !!month,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDetailedWeeklyReport(startDate: string) {
  return useQuery({
    queryKey: ['report', 'weekly', 'detailed', startDate],
    queryFn: () => fetchJson(`/api/reports/weekly?startDate=${startDate}`),
    enabled: !!startDate,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDetailedMonthlyReport(year: number, month: number) {
  return useQuery({
    queryKey: ['report', 'monthly', 'detailed', year, month],
    queryFn: () => fetchJson(`/api/reports/monthly?year=${year}&month=${month}`),
    enabled: !!year && !!month,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubjectTrends(months: number = 6) {
  return useQuery({
    queryKey: ['report', 'trends', months],
    queryFn: () => fetchJson(`/api/reports/trends?months=${months}`),
    staleTime: 10 * 60 * 1000,
  });
}
