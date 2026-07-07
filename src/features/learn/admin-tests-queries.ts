import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { QuestionKind } from "./tests-queries";

/** Matches backend AdminOptionResponse (includes the answer key). */
export interface AdminOption {
  id: string;
  label: string;
  correct: boolean;
  sortOrder: number;
}

/** Matches backend AdminQuestionResponse. */
export interface AdminQuestion {
  id: string;
  prompt: string;
  kind: QuestionKind;
  sortOrder: number;
  options: AdminOption[];
}

/** Matches backend AdminTestSummaryResponse. */
export interface AdminTestSummary {
  id: string;
  title: string;
  passPercent: number;
  timeLimitMin: number;
  attemptsAllowed: number;
  questionCount: number;
}

/** Matches backend AdminTestDetailResponse. */
export interface AdminTestDetail extends Omit<AdminTestSummary, "questionCount"> {
  questions: AdminQuestion[];
}

/** Matches backend TestRequest. */
export interface TestInput {
  title: string;
  passPercent: number;
  timeLimitMin: number;
  attemptsAllowed: number;
}

/** Matches backend QuestionOptionInput. */
export interface QuestionOptionInput {
  label: string;
  correct: boolean;
}

/** Matches backend QuestionRequest. */
export interface QuestionInput {
  prompt: string;
  kind: QuestionKind;
  options: QuestionOptionInput[];
}

export function useAdminCourseTestsQuery(courseId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "learn", "tests", "course", courseId],
    queryFn: () => api.get<AdminTestSummary[]>(`/admin/learn/courses/${courseId}/tests`),
    enabled: Boolean(courseId),
  });
}

export function useAdminTestQuery(testId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "learn", "tests", "detail", testId],
    queryFn: () => api.get<AdminTestDetail>(`/admin/learn/tests/${testId}`),
    enabled: Boolean(testId),
  });
}

export function useCreateTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, input }: { courseId: string; input: TestInput }) =>
      api.post<AdminTestSummary>(`/admin/learn/courses/${courseId}/tests`, input),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "learn", "tests", "course", courseId] });
      queryClient.invalidateQueries({ queryKey: ["learn", "tests", "course", courseId] });
    },
  });
}

export function useAddQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ testId, input }: { testId: string; input: QuestionInput }) =>
      api.post<AdminQuestion>(`/admin/learn/tests/${testId}/questions`, input),
    onSuccess: (_, { testId }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "learn", "tests", "detail", testId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "learn", "tests", "course"] });
    },
  });
}
