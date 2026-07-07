import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

/** Matches backend CompletionFunnelResponse. */
export interface CompletionFunnel {
  enrolled: number;
  startedLesson: number;
  completedAllLessons: number;
  certified: number;
}

/** Matches backend DailyEnrollmentCount. */
export interface DailyEnrollmentCount {
  date: string;
  count: number;
}

/** Matches backend CourseRevenueResponse. */
export interface CourseRevenue {
  courseTitle: string;
  revenue: number;
}

/** Matches backend AdminAnalyticsResponse. */
export interface AdminAnalytics {
  totalEnrollments: number;
  totalRevenue: number;
  completionFunnel: CompletionFunnel;
  enrollmentsByDay: DailyEnrollmentCount[];
  revenueByCourse: CourseRevenue[];
  attendanceRatePercent: number;
}

export function useAdminAnalyticsQuery() {
  return useQuery({
    queryKey: ["admin", "learn", "analytics"],
    queryFn: () => api.get<AdminAnalytics>("/admin/learn/analytics"),
  });
}
