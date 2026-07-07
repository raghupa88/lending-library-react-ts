import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export type QuestionKind = "SINGLE" | "MULTI" | "TRUEFALSE";

/** Matches backend TestListItemResponse. */
export interface TestListItem {
  id: string;
  title: string;
  passPercent: number;
  timeLimitMin: number;
  attemptsAllowed: number;
  attemptsUsed: number;
  bestScorePercent: number | null;
  passed: boolean;
}

/** Matches backend OptionResponse (no `correct` — never leak the answer key pre-submit). */
export interface TestOption {
  id: string;
  label: string;
  sortOrder: number;
}

/** Matches backend QuestionResponse. */
export interface TestQuestion {
  id: string;
  prompt: string;
  kind: QuestionKind;
  sortOrder: number;
  options: TestOption[];
}

/** Matches backend TestForLearnerResponse. */
export interface TestForTaking {
  id: string;
  title: string;
  passPercent: number;
  timeLimitMin: number;
  attemptsAllowed: number;
  attemptsUsed: number;
  questions: TestQuestion[];
}

/** Matches backend AttemptStartResponse. */
export interface AttemptStart {
  attemptId: string;
  testId: string;
  startedAt: string;
  timeLimitMin: number;
}

/** Matches backend QuestionResultResponse. */
export interface QuestionResult {
  questionId: string;
  correct: boolean;
  correctOptionIds: string[];
  selectedOptionIds: string[];
}

/** Matches backend AttemptResultResponse. */
export interface AttemptResult {
  attemptId: string;
  scorePercent: number;
  passed: boolean;
  attemptsUsed: number;
  attemptsAllowed: number;
  certificateIssued: boolean;
  certificateSerial: string | null;
  questionResults: QuestionResult[];
}

export interface AnswerInput {
  questionId: string;
  selectedOptionIds: string[];
}

/** Matches backend CertificateResponse. */
export interface Certificate {
  id: string;
  courseTitle: string;
  courseSlug: string;
  issuedAt: string;
  serial: string;
}

/** Matches backend CertificateVerifyResponse. */
export interface CertificateVerify {
  serial: string;
  learnerName: string;
  courseTitle: string;
  issuedAt: string;
}

export function useCourseTestsQuery(courseId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["learn", "tests", "course", courseId],
    queryFn: () => api.get<TestListItem[]>(`/learn/courses/${courseId}/tests`),
    enabled: Boolean(courseId) && enabled,
  });
}

export function useTestQuery(testId: string | undefined) {
  return useQuery({
    queryKey: ["learn", "tests", "detail", testId],
    queryFn: () => api.get<TestForTaking>(`/learn/tests/${testId}`),
    enabled: Boolean(testId),
  });
}

export function useStartAttempt() {
  return useMutation({
    mutationFn: (testId: string) => api.post<AttemptStart>(`/learn/tests/${testId}/attempts`),
  });
}

export function useSubmitAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ attemptId, answers }: { attemptId: string; answers: AnswerInput[] }) =>
      api.post<AttemptResult>(`/learn/attempts/${attemptId}/submit`, { answers }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learn", "tests"] });
      queryClient.invalidateQueries({ queryKey: ["learn", "certificates"] });
    },
  });
}

export function useMyCertificatesQuery(enabled = true) {
  return useQuery({
    queryKey: ["learn", "certificates", "mine"],
    queryFn: () => api.get<Certificate[]>("/learn/me/certificates"),
    enabled,
  });
}

export function useCertificateVerifyQuery(serial: string | undefined) {
  return useQuery({
    queryKey: ["learn", "certificates", "verify", serial],
    queryFn: () => api.get<CertificateVerify>(`/learn/certificates/${serial}`),
    enabled: Boolean(serial),
    retry: false,
  });
}
