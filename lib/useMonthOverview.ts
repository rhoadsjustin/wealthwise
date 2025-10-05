import { useRouter } from 'expo-router';

/**
 * Utility hook for navigating to the month overview modal
 */
export const useMonthOverview = () => {
  const router = useRouter();

  const openCurrentMonth = () => {
    router.push('/month-overview' as any);
  };

  const openSpecificMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    router.push({
      pathname: '/month-overview' as any,
      params: { month: date.toISOString() },
    });
  };

  const openMonthFromDate = (dateString: string) => {
    const date = new Date(dateString);
    openSpecificMonth(date.getFullYear(), date.getMonth());
  };

  return {
    openCurrentMonth,
    openSpecificMonth,
    openMonthFromDate,
  };
};