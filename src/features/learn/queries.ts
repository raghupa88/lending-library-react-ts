import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export type CourseTrack =
  | "MONEY_FOUNDATIONS"
  | "EQUITIES"
  | "BONDS_FIXED_INCOME"
  | "DERIVATIVES"
  | "PORTFOLIO_RISK";

export type CourseLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type CourseStatus = "DRAFT" | "PUBLISHED" | "RETIRED";
export type LessonKind = "VIDEO" | "ARTICLE" | "PDF" | "SLIDES";
export type EnrollmentStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

/** Matches backend CourseSummaryResponse. */
export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  track: CourseTrack;
  level: CourseLevel;
  language: string;
  summary: string;
  price: number;
  status: CourseStatus;
  moduleCount: number;
  lessonCount: number;
}

/** Matches backend LessonResponse. */
export interface Lesson {
  id: string;
  title: string;
  kind: LessonKind;
  contentUrl: string | null;
  body: string | null;
  estMinutes: number;
  sortOrder: number;
}

/** Matches backend ModuleResponse. */
export interface CourseModule {
  id: string;
  title: string;
  sortOrder: number;
  lessons: Lesson[];
}

/** Matches backend CourseDetailResponse. */
export interface CourseDetail extends CourseSummary {
  modules: CourseModule[];
}

/** Matches backend EnrollmentResponse. */
export interface Enrollment {
  id: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  totalLessons: number;
  completedLessons: number;
  nextLessonId: string | null;
}

/** Matches backend CourseProgressResponse. */
export interface CourseProgress {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  completedLessonIds: string[];
  nextLessonId: string | null;
}

export interface PagedCourses {
  content: CourseSummary[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CourseQueryFilters {
  track?: CourseTrack;
  level?: CourseLevel;
  language?: string;
  page?: number;
  size?: number;
}

function buildQuery(filters: CourseQueryFilters): string {
  const params = new URLSearchParams();
  if (filters.track) params.set("track", filters.track);
  if (filters.level) params.set("level", filters.level);
  if (filters.language) params.set("language", filters.language);
  if (filters.page !== undefined) params.set("page", String(filters.page));
  params.set("size", String(filters.size ?? 20));
  return params.toString();
}

export function useCoursesQuery(filters: CourseQueryFilters = {}) {
  return useQuery({
    queryKey: ["learn", "courses", filters],
    queryFn: () => api.get<PagedCourses>(`/learn/courses?${buildQuery(filters)}`),
  });
}

export function useCourseQuery(slug: string | undefined) {
  return useQuery({
    queryKey: ["learn", "courses", "detail", slug],
    queryFn: () => api.get<CourseDetail>(`/learn/courses/${slug}`),
    enabled: Boolean(slug),
  });
}

export function useMyEnrollmentsQuery(enabled = true) {
  return useQuery({
    queryKey: ["learn", "enrollments"],
    queryFn: () => api.get<Enrollment[]>("/learn/me/enrollments"),
    enabled,
  });
}

export function useEnrollInCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) =>
      api.post<Enrollment>(`/learn/courses/${courseId}/enroll`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learn", "enrollments"] });
    },
  });
}

export function useCourseProgressQuery(courseId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["learn", "progress", courseId],
    queryFn: () => api.get<CourseProgress>(`/learn/courses/${courseId}/progress`),
    enabled: Boolean(courseId) && enabled,
  });
}

export function useCompleteLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) =>
      api.post<CourseProgress>(`/learn/lessons/${lessonId}/complete`),
    onSuccess: (progress) => {
      queryClient.setQueryData(["learn", "progress", progress.courseId], progress);
      queryClient.invalidateQueries({ queryKey: ["learn", "enrollments"] });
    },
  });
}
