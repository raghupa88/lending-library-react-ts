import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, GraduationCap, CheckCircle2, Circle, FileText, Video, FileStack, PlayCircle, ClipboardCheck, MapPin, Users } from "lucide-react";
import {
  useCourseQuery,
  useEnrollInCourse,
  useMyEnrollmentsQuery,
  useCourseProgressQuery,
  type Lesson,
} from "../../features/learn/queries";
import { useCourseTestsQuery } from "../../features/learn/tests-queries";
import { useCourseBatchesQuery, useBookSeat, type BatchForLearner } from "../../features/learn/batches-queries";
import { TRACK_LABELS, LEVEL_LABELS } from "../../features/learn/labels";
import { Badge } from "../../components/ui/badge";
import { Button, buttonVariants } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { ProgressBar } from "../../components/ui/progress-bar";
import { useToast } from "../../components/ui/toast";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../lib/api";
import type { PaymentInput } from "../../lib/payment";
import { CheckoutDialog } from "../../components/payments/CheckoutDialog";
import { cn } from "../../lib/cn";

type CheckoutState = { type: "enroll" } | { type: "batch"; batch: BatchForLearner } | null;

const KIND_ICONS: Record<Lesson["kind"], typeof FileText> = {
  ARTICLE: FileText,
  VIDEO: Video,
  PDF: FileStack,
  SLIDES: PlayCircle,
};

export default function LearnDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: course, isLoading, isError } = useCourseQuery(slug);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const enroll = useEnrollInCourse();
  const { data: enrollments } = useMyEnrollmentsQuery(Boolean(user));

  const enrollment = enrollments?.find((e) => e.courseSlug === slug);
  const alreadyEnrolled = Boolean(enrollment);
  const { data: progress } = useCourseProgressQuery(course?.id, alreadyEnrolled);
  const completedIds = new Set(progress?.completedLessonIds ?? []);
  const { data: tests } = useCourseTestsQuery(course?.id, alreadyEnrolled);
  const { data: batches } = useCourseBatchesQuery(course?.id);
  const bookSeat = useBookSeat();
  const [checkout, setCheckout] = useState<CheckoutState>(null);

  const handleBookSeat = (batch: BatchForLearner) => {
    if (!user) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (batch.fee > 0) {
      setCheckout({ type: "batch", batch });
      return;
    }
    bookSeat.mutate(
      { batchId: batch.id },
      {
        onSuccess: (booking) =>
          toast(
            "success",
            booking.status === "CONFIRMED" ? "Seat booked!" : "You've been added to the waitlist",
            <Link to="/dashboard" className="font-medium text-accent hover:text-accent-hover">
              View on your dashboard →
            </Link>,
          ),
        onError: (err) =>
          toast("error", err instanceof ApiError ? err.message : "Couldn't book a seat"),
      },
    );
  };

  const handleEnroll = () => {
    if (!user || !course) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (course.price > 0) {
      setCheckout({ type: "enroll" });
      return;
    }
    enroll.mutate(
      { courseId: course.id },
      {
        onSuccess: () =>
          toast(
            "success",
            `Enrolled in "${course.title}"!`,
            <Link to="/dashboard" className="font-medium text-accent hover:text-accent-hover">
              View on your dashboard →
            </Link>,
          ),
        onError: (err) => {
          toast("error", err instanceof ApiError ? err.message : "Couldn't enroll in this course");
        },
      },
    );
  };

  const handleCheckoutSubmit = async (payment: PaymentInput) => {
    if (!checkout || !course) return;
    if (checkout.type === "enroll") {
      const enrollment = await enroll.mutateAsync({ courseId: course.id, payment });
      toast(
        "success",
        `Enrolled in "${course.title}"! Charged ₹${enrollment.amountPaid.toFixed(2)}`,
        <Link to="/dashboard" className="font-medium text-accent hover:text-accent-hover">
          View on your dashboard →
        </Link>,
      );
    } else {
      const booking = await bookSeat.mutateAsync({ batchId: checkout.batch.id, payment });
      toast(
        "success",
        `Seat booked! Charged ₹${booking.amountPaid.toFixed(2)}`,
        <Link to="/dashboard" className="font-medium text-accent hover:text-accent-hover">
          View on your dashboard →
        </Link>,
      );
    }
    setCheckout(null);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        to="/learn"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Suvadi Learn
      </Link>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {isError && (
        <EmptyState
          icon={<GraduationCap aria-hidden="true" />}
          title="Course not found"
          description="This course may not be published yet."
        />
      )}

      {course && (
        <article>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{TRACK_LABELS[course.track]}</Badge>
            <Badge variant="outline">{LEVEL_LABELS[course.level]}</Badge>
            <Badge variant="outline">{course.language}</Badge>
            {course.price === 0 && <Badge variant="success">Free</Badge>}
          </div>

          <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">{course.title}</h1>
          <p className="mt-3 max-w-prose leading-relaxed text-muted">{course.summary}</p>

          <div className="mt-6">
            {alreadyEnrolled ? (
              <>
                {enrollment && (
                  <ProgressBar
                    className="mb-4 max-w-sm"
                    label="Course progress"
                    value={enrollment.completedLessons}
                    max={enrollment.totalLessons}
                  />
                )}
                <Link
                  to={`/learn/${slug}/lesson/${
                    enrollment?.nextLessonId ?? course.modules[0]?.lessons[0]?.id ?? ""
                  }`}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-(--radius-control) bg-accent px-5 text-sm font-medium text-accent-foreground shadow-soft transition-colors hover:bg-accent-hover",
                  )}
                >
                  {enrollment?.nextLessonId ? "Continue learning" : "Review course"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </>
            ) : (
              <>
                <Button size="lg" disabled={enroll.isPending} onClick={handleEnroll}>
                  {enroll.isPending
                    ? "Enrolling…"
                    : course.price > 0
                      ? `Enroll — ₹${course.price.toFixed(2)}`
                      : "Enroll for free"}
                </Button>
                {!user && (
                  <p className="mt-2 text-sm text-muted">
                    You'll be asked to sign in before enrolling.
                  </p>
                )}
              </>
            )}
          </div>

          <h2 className="mt-10 font-display text-xl font-semibold">Syllabus</h2>
          <ol className="mt-4 space-y-4">
            {course.modules.map((module, i) => (
              <li key={module.id} className="rounded-(--radius-card) border border-border bg-surface p-4">
                <h3 className="font-medium">
                  <span className="text-muted">Module {i + 1}: </span>
                  {module.title}
                </h3>
                <ul className="mt-3 space-y-2">
                  {module.lessons.map((lesson) => {
                    const Icon = KIND_ICONS[lesson.kind];
                    const done = completedIds.has(lesson.id);
                    const content = (
                      <>
                        {alreadyEnrolled ? (
                          done ? (
                            <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
                          ) : (
                            <Circle className="size-4 shrink-0 text-muted" aria-hidden="true" />
                          )
                        ) : (
                          <Icon className="size-4 shrink-0 text-muted" aria-hidden="true" />
                        )}
                        <span className="flex-1">{lesson.title}</span>
                        <span className="text-xs text-muted">{lesson.estMinutes} min</span>
                      </>
                    );
                    return (
                      <li key={lesson.id} className="text-sm">
                        {alreadyEnrolled ? (
                          <Link
                            to={`/learn/${slug}/lesson/${lesson.id}`}
                            className="flex items-center gap-2.5 rounded-(--radius-control) py-1 hover:text-accent"
                          >
                            {content}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-2.5">{content}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>

          {alreadyEnrolled && tests && tests.length > 0 && (
            <>
              <h2 className="mt-10 font-display text-xl font-semibold">Tests</h2>
              <ul className="mt-4 space-y-3">
                {tests.map((t) => {
                  const attemptsLeft = t.attemptsAllowed - t.attemptsUsed;
                  return (
                    <li key={t.id}>
                      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div>
                          <div className="flex items-center gap-2 font-medium">
                            <ClipboardCheck className="size-4 text-muted" aria-hidden="true" />
                            {t.title}
                          </div>
                          <div className="mt-1 text-sm text-muted">
                            Pass at {t.passPercent}% · {t.timeLimitMin} min ·{" "}
                            {attemptsLeft > 0
                              ? `${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left`
                              : "No attempts left"}
                            {t.bestScorePercent != null && ` · Best score ${t.bestScorePercent}%`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {t.passed && <Badge variant="success">Passed</Badge>}
                          <Link
                            to={`/learn/${slug}/test/${t.id}`}
                            className={cn(
                              buttonVariants({ variant: t.passed ? "secondary" : "primary", size: "sm" }),
                              attemptsLeft <= 0 && !t.passed && "pointer-events-none opacity-50",
                            )}
                            aria-disabled={attemptsLeft <= 0 && !t.passed}
                          >
                            {t.passed ? "Retake" : "Take test"}
                          </Link>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {batches && batches.length > 0 && (
            <>
              <h2 className="mt-10 font-display text-xl font-semibold">Upcoming in-person batches</h2>
              <ul className="mt-4 space-y-3">
                {batches.map((b) => (
                  <li key={b.id}>
                    <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          <MapPin className="size-4 text-muted" aria-hidden="true" />
                          {b.venueName}, {b.city}
                        </div>
                        <div className="mt-1 text-sm text-muted">
                          {b.startsOn} – {b.endsOn} · {b.scheduleText} · {b.instructorName}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                          <Users className="size-4" aria-hidden="true" />
                          {b.seatsAvailable > 0
                            ? `${b.seatsAvailable} seat${b.seatsAvailable === 1 ? "" : "s"} available`
                            : b.fee > 0
                              ? "Full"
                              : "Full — bookings join the waitlist"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {b.myBookingStatus === "CONFIRMED" && <Badge variant="success">You're booked</Badge>}
                        {b.myBookingStatus === "WAITLISTED" && <Badge variant="outline">Waitlisted</Badge>}
                        {!b.myBookingStatus && b.fee > 0 && b.seatsAvailable === 0 && (
                          <Badge variant="outline">Full</Badge>
                        )}
                        {!b.myBookingStatus && (b.fee === 0 || b.seatsAvailable > 0) && (
                          <Button
                            size="sm"
                            disabled={bookSeat.isPending}
                            onClick={() => handleBookSeat(b)}
                          >
                            {b.seatsAvailable > 0
                              ? b.fee > 0
                                ? `Book a seat — ₹${b.fee.toFixed(2)}`
                                : "Book a seat"
                              : "Join waitlist"}
                          </Button>
                        )}
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>
      )}

      {checkout && course && (
        <CheckoutDialog
          title={checkout.type === "enroll" ? `Enroll in ${course.title}` : "Book a seat"}
          amount={checkout.type === "enroll" ? course.price : checkout.batch.fee}
          onClose={() => setCheckout(null)}
          onSubmit={handleCheckoutSubmit}
        />
      )}
    </div>
  );
}
