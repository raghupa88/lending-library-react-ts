import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type {
  CourseDetail,
  CourseLevel,
  CourseModule,
  CourseSummary,
  CourseTrack,
  Lesson,
  LessonKind,
} from "./queries";

/** Matches backend CourseRequest. */
export interface CourseInput {
  slug: string;
  title: string;
  track: CourseTrack;
  level: CourseLevel;
  language: string;
  summary: string;
  price: number;
}

/** Matches backend ModuleRequest. */
export interface ModuleInput {
  title: string;
}

/** Matches backend LessonRequest. */
export interface LessonInput {
  title: string;
  kind: LessonKind;
  contentUrl?: string | null;
  body?: string | null;
  estMinutes: number;
}

export function useAdminCoursesQuery() {
  return useQuery({
    queryKey: ["admin", "learn", "courses"],
    queryFn: () => api.get<CourseSummary[]>("/admin/learn/courses"),
  });
}

export function useAdminCourseQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "learn", "courses", "detail", id],
    queryFn: () => api.get<CourseDetail>(`/admin/learn/courses/${id}`),
    enabled: Boolean(id),
  });
}

function invalidateCourses(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["admin", "learn", "courses"] });
  queryClient.invalidateQueries({ queryKey: ["learn", "courses"] });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CourseInput) => api.post<CourseSummary>("/admin/learn/courses", input),
    onSuccess: () => invalidateCourses(queryClient),
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CourseInput }) =>
      api.put<CourseSummary>(`/admin/learn/courses/${id}`, input),
    onSuccess: (_, { id }) => {
      invalidateCourses(queryClient);
      queryClient.invalidateQueries({ queryKey: ["admin", "learn", "courses", "detail", id] });
    },
  });
}

export function useSetCoursePublished() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      api.put<CourseSummary>(`/admin/learn/courses/${id}/${published ? "publish" : "unpublish"}`),
    onSuccess: (_, { id }) => {
      invalidateCourses(queryClient);
      queryClient.invalidateQueries({ queryKey: ["admin", "learn", "courses", "detail", id] });
    },
  });
}

export function useAddModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, input }: { courseId: string; input: ModuleInput }) =>
      api.post<CourseModule>(`/admin/learn/courses/${courseId}/modules`, input),
    onSuccess: (_, { courseId }) => {
      invalidateCourses(queryClient);
      queryClient.invalidateQueries({ queryKey: ["admin", "learn", "courses", "detail", courseId] });
    },
  });
}

export function useAddLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, input }: { moduleId: string; input: LessonInput }) =>
      api.post<Lesson>(`/admin/learn/modules/${moduleId}/lessons`, input),
    onSuccess: () => {
      // Any course detail view could contain this module; broad invalidation is
      // cheap here since admin course lists/details are small.
      queryClient.invalidateQueries({ queryKey: ["admin", "learn", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["learn", "courses"] });
    },
  });
}
