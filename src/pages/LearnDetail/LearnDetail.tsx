import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, GraduationCap, CheckCircle2, FileText, Video, FileStack, PlayCircle } from "lucide-react";
import {
  useCourseQuery,
  useEnrollInCourse,
  useMyEnrollmentsQuery,
  type Lesson,
} from "../../features/learn/queries";
import { TRACK_LABELS, LEVEL_LABELS } from "../../features/learn/labels";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { useToast } from "../../components/ui/toast";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../lib/api";

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

  const alreadyEnrolled = Boolean(enrollments?.some((e) => e.courseSlug === slug));

  const handleEnroll = () => {
    if (!user || !course) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
      return;
    }
    enroll.mutate(course.id, {
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
    });
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
            <Button size="lg" disabled={alreadyEnrolled || enroll.isPending} onClick={handleEnroll}>
              {alreadyEnrolled ? (
                <>
                  <CheckCircle2 aria-hidden="true" />
                  Already enrolled
                </>
              ) : enroll.isPending ? (
                "Enrolling…"
              ) : (
                "Enroll for free"
              )}
            </Button>
            {!user && (
              <p className="mt-2 text-sm text-muted">
                You'll be asked to sign in before enrolling.
              </p>
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
                    return (
                      <li key={lesson.id} className="flex items-center gap-2.5 text-sm">
                        <Icon className="size-4 shrink-0 text-muted" aria-hidden="true" />
                        <span className="flex-1">{lesson.title}</span>
                        <span className="text-xs text-muted">{lesson.estMinutes} min</span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        </article>
      )}
    </div>
  );
}
