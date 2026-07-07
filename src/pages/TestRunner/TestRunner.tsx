import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, XCircle } from "lucide-react";
import {
  useTestQuery,
  useStartAttempt,
  useSubmitAttempt,
  type AttemptResult,
  type AttemptStart,
} from "../../features/learn/tests-queries";
import { Button, buttonVariants } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { useToast } from "../../components/ui/toast";
import { ApiError } from "../../lib/api";
import { cn } from "../../lib/cn";

type Phase = "intro" | "taking" | "review" | "result";

function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TestRunner() {
  const { slug, testId } = useParams<{ slug: string; testId: string }>();
  const { toast } = useToast();
  const { data: test, isLoading, isError } = useTestQuery(testId);
  const startAttempt = useStartAttempt();
  const submitAttempt = useSubmitAttempt();

  const [phase, setPhase] = useState<Phase>("intro");
  const [attempt, setAttempt] = useState<AttemptStart | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (phase !== "taking" && phase !== "review") return;
    if (!attempt) return;
    const deadline = new Date(attempt.startedAt).getTime() + attempt.timeLimitMin * 60_000;
    const tick = () => setSecondsLeft(Math.round((deadline - Date.now()) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [phase, attempt]);

  const questions = useMemo(() => test?.questions ?? [], [test]);
  const currentQuestion = questions[currentIndex];
  const optionsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const q of questions) for (const o of q.options) map.set(o.id, o.label);
    return map;
  }, [questions]);

  const handleStart = () => {
    if (!testId) return;
    startAttempt.mutate(testId, {
      onSuccess: (a) => {
        setAttempt(a);
        setAnswers({});
        setCurrentIndex(0);
        setPhase("taking");
      },
      onError: (err) => {
        toast("error", err instanceof ApiError ? err.message : "Couldn't start this test");
      },
    });
  };

  const selectOption = (questionId: string, optionId: string, multi: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      if (multi) {
        const next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        return { ...prev, [questionId]: next };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  };

  const handleSubmit = () => {
    if (!attempt) return;
    submitAttempt.mutate(
      {
        attemptId: attempt.attemptId,
        answers: questions.map((q) => ({ questionId: q.id, selectedOptionIds: answers[q.id] ?? [] })),
      },
      {
        onSuccess: (r) => {
          setResult(r);
          setPhase("result");
        },
        onError: (err) => {
          toast("error", err instanceof ApiError ? err.message : "Couldn't submit this attempt");
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="mt-6 h-48 w-full" />
      </div>
    );
  }

  if (isError || !test) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <EmptyState
          title="Test unavailable"
          description="This test may not exist, or you may need to enroll in the course first."
          action={
            <Link to={`/learn/${slug}`} className={cn(buttonVariants({ size: "md" }))}>
              Go to course
            </Link>
          }
        />
      </div>
    );
  }

  const attemptsLeft = test.attemptsAllowed - test.attemptsUsed;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        to={`/learn/${slug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to course
      </Link>

      {phase === "intro" && (
        <div className="rounded-(--radius-card) border border-border bg-surface p-6">
          <h1 className="font-display text-2xl font-semibold">{test.title}</h1>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">Pass mark</dt>
              <dd className="font-medium">{test.passPercent}%</dd>
            </div>
            <div>
              <dt className="text-muted">Time limit</dt>
              <dd className="font-medium">{test.timeLimitMin} min</dd>
            </div>
            <div>
              <dt className="text-muted">Attempts left</dt>
              <dd className="font-medium">
                {attemptsLeft} of {test.attemptsAllowed}
              </dd>
            </div>
          </dl>
          <Button
            size="lg"
            className="mt-6"
            disabled={attemptsLeft <= 0 || startAttempt.isPending}
            onClick={handleStart}
          >
            {attemptsLeft <= 0
              ? "No attempts left"
              : startAttempt.isPending
                ? "Starting…"
                : "Start test"}
          </Button>
        </div>
      )}

      {(phase === "taking" || phase === "review") && attempt && (
        <div>
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="font-medium text-muted">
              {phase === "taking"
                ? `Question ${currentIndex + 1} of ${questions.length}`
                : "Review your answers"}
            </span>
            <span
              className={cn(
                "flex items-center gap-1.5 font-medium",
                secondsLeft <= 0 ? "text-danger" : "text-muted",
              )}
            >
              <Clock className="size-4" aria-hidden="true" />
              {secondsLeft <= 0 ? "Time's up" : formatClock(secondsLeft)}
            </span>
          </div>

          {phase === "taking" && currentQuestion && (
            <fieldset className="rounded-(--radius-card) border border-border bg-surface p-6">
              <legend className="font-display text-lg font-semibold">{currentQuestion.prompt}</legend>
              <div className="mt-4 space-y-2">
                {currentQuestion.options.map((option) => {
                  const multi = currentQuestion.kind === "MULTI";
                  const checked = (answers[currentQuestion.id] ?? []).includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-(--radius-control) border border-border p-3 text-sm transition-colors hover:bg-surface-2",
                        checked && "border-accent bg-accent/10",
                      )}
                    >
                      <input
                        type={multi ? "checkbox" : "radio"}
                        name={`question-${currentQuestion.id}`}
                        checked={checked}
                        onChange={() => selectOption(currentQuestion.id, option.id, multi)}
                        className="size-4 accent-accent"
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {phase === "review" && (
            <ol className="space-y-3">
              {questions.map((q, i) => {
                const selected = answers[q.id] ?? [];
                return (
                  <li key={q.id} className="rounded-(--radius-card) border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">
                        {i + 1}. {q.prompt}
                      </p>
                      <button
                        type="button"
                        className="shrink-0 text-sm font-medium text-accent hover:text-accent-hover"
                        onClick={() => {
                          setCurrentIndex(i);
                          setPhase("taking");
                        }}
                      >
                        Edit
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {selected.length === 0
                        ? "Not answered"
                        : selected.map((id) => optionsById.get(id)).join(", ")}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              className={phase === "review" ? "invisible" : undefined}
            >
              <ArrowLeft aria-hidden="true" />
              Previous
            </Button>

            {phase === "taking" &&
              (currentIndex < questions.length - 1 ? (
                <Button onClick={() => setCurrentIndex((i) => i + 1)}>
                  Next
                  <ArrowRight aria-hidden="true" />
                </Button>
              ) : (
                <Button onClick={() => setPhase("review")}>Review answers</Button>
              ))}

            {phase === "review" && (
              <Button disabled={submitAttempt.isPending} onClick={handleSubmit}>
                {submitAttempt.isPending ? "Submitting…" : "Submit test"}
              </Button>
            )}
          </div>
        </div>
      )}

      {phase === "result" && result && (
        <div>
          <div
            className={cn(
              "flex items-center gap-3 rounded-(--radius-card) border p-6",
              result.passed ? "border-success bg-success/10" : "border-danger bg-danger/10",
            )}
          >
            {result.passed ? (
              <CheckCircle2 className="size-8 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <XCircle className="size-8 shrink-0 text-danger" aria-hidden="true" />
            )}
            <div>
              <h1 className="font-display text-2xl font-semibold">
                {result.passed ? "You passed!" : "Not quite"}
              </h1>
              <p className="text-muted">
                Scored {result.scorePercent}% · {result.attemptsUsed} of {result.attemptsAllowed} attempts used
              </p>
            </div>
          </div>

          {result.certificateSerial && (
            <div className="mt-4 flex items-center justify-between rounded-(--radius-card) border border-border bg-surface p-4">
              <span className="text-sm">
                {result.certificateIssued ? "Certificate earned!" : "You already hold a certificate for this course."}
              </span>
              <Link
                to={`/certificates/${result.certificateSerial}`}
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
              >
                View certificate
              </Link>
            </div>
          )}

          <h2 className="mt-8 font-display text-lg font-semibold">Question review</h2>
          <ol className="mt-4 space-y-3">
            {result.questionResults.map((qr, i) => {
              const question = questions.find((q) => q.id === qr.questionId);
              return (
                <li key={qr.questionId} className="rounded-(--radius-card) border border-border bg-surface p-4">
                  <div className="flex items-start gap-2">
                    {qr.correct ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
                    )}
                    <div>
                      <p className="font-medium">
                        {i + 1}. {question?.prompt}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        Your answer:{" "}
                        {qr.selectedOptionIds.length === 0
                          ? "Not answered"
                          : qr.selectedOptionIds.map((id) => optionsById.get(id)).join(", ")}
                      </p>
                      {!qr.correct && (
                        <p className="mt-1 text-sm text-success">
                          Correct answer: {qr.correctOptionIds.map((id) => optionsById.get(id)).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={`/learn/${slug}`} className={cn(buttonVariants({ variant: "secondary" }))}>
              Back to course
            </Link>
            {!result.passed && result.attemptsUsed < result.attemptsAllowed && (
              <Button
                onClick={() => {
                  setPhase("intro");
                  setResult(null);
                  setAttempt(null);
                }}
              >
                Retake test
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
