import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  FileStack,
  FileText,
  PlayCircle,
  Video,
} from "lucide-react";
import { useCourseQuery, useCourseProgressQuery, useCompleteLesson, type Lesson } from "../../features/learn/queries";
import { Button, buttonVariants } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { ProgressBar } from "../../components/ui/progress-bar";
import { useToast } from "../../components/ui/toast";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../lib/api";
import { cn } from "../../lib/cn";

const KIND_ICONS: Record<Lesson["kind"], typeof FileText> = {
  ARTICLE: FileText,
  VIDEO: Video,
  PDF: FileStack,
  SLIDES: PlayCircle,
};

export default function LessonPlayer() {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: course, isLoading: courseLoading } = useCourseQuery(slug);
  const {
    data: progress,
    isLoading: progressLoading,
    isError: progressError,
  } = useCourseProgressQuery(course?.id, Boolean(user));
  const completeLesson = useCompleteLesson();

  const orderedLessons = (course?.modules ?? []).flatMap((m) => m.lessons);
  const currentIndex = orderedLessons.findIndex((l) => l.id === lessonId);
  const lesson = currentIndex >= 0 ? orderedLessons[currentIndex] : undefined;
  const prevLesson = currentIndex > 0 ? orderedLessons[currentIndex - 1] : undefined;
  const nextLesson =
    currentIndex >= 0 && currentIndex < orderedLessons.length - 1
      ? orderedLessons[currentIndex + 1]
      : undefined;

  const completedIds = new Set(progress?.completedLessonIds ?? []);
  const isCompleted = lessonId ? completedIds.has(lessonId) : false;

  const handleComplete = () => {
    if (!lessonId) return;
    completeLesson.mutate(lessonId, {
      onSuccess: (result) => {
        if (result.nextLessonId) {
          navigate(`/learn/${slug}/lesson/${result.nextLessonId}`);
        } else {
          toast("success", "Course complete! Great work.");
          navigate(`/learn/${slug}`);
        }
      },
      onError: (err) => {
        toast("error", err instanceof ApiError ? err.message : "Couldn't save your progress");
      },
    });
  };

  if (courseLoading || progressLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  if (!course || !lesson) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <EmptyState title="Lesson not found" description="This lesson may have been removed." />
      </div>
    );
  }

  if (progressError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <EmptyState
          title="Enroll to unlock this lesson"
          description={`You need to be enrolled in "${course.title}" to view its lessons.`}
          action={
            <Link to={`/learn/${slug}`} className={cn(buttonVariants({ size: "md" }))}>
              Go to course
            </Link>
          }
        />
      </div>
    );
  }

  const Icon = KIND_ICONS[lesson.kind];

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[260px_1fr]">
      <aside className="order-2 md:order-1">
        <Link
          to={`/learn/${slug}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {course.title}
        </Link>
        {progress && (
          <ProgressBar
            className="mb-4"
            label="Course progress"
            value={progress.completedLessons}
            max={progress.totalLessons}
          />
        )}
        <nav aria-label="Lesson outline" className="space-y-4">
          {course.modules.map((module) => (
            <div key={module.id}>
              <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
                {module.title}
              </h2>
              <ul className="space-y-0.5">
                {module.lessons.map((l) => {
                  const done = completedIds.has(l.id);
                  const active = l.id === lessonId;
                  return (
                    <li key={l.id}>
                      <Link
                        to={`/learn/${slug}/lesson/${l.id}`}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2 rounded-(--radius-control) px-2 py-1.5 text-sm",
                          active ? "bg-surface-2 font-medium text-foreground" : "text-muted hover:text-foreground",
                        )}
                      >
                        {done ? (
                          <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
                        ) : (
                          <Circle className="size-4 shrink-0" aria-hidden="true" />
                        )}
                        {l.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <article className="order-1 min-w-0 md:order-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Icon className="size-4" aria-hidden="true" />
          {lesson.kind} · {lesson.estMinutes} min
        </div>
        <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{lesson.title}</h1>

        <div className="mt-6 rounded-(--radius-card) border border-border bg-surface p-6">
          {lesson.kind === "VIDEO" && lesson.contentUrl && (
            <div className="mb-4 aspect-video overflow-hidden rounded-(--radius-control)">
              <iframe
                src={lesson.contentUrl}
                title={lesson.title}
                className="size-full"
                allowFullScreen
              />
            </div>
          )}
          {(lesson.kind === "PDF" || lesson.kind === "SLIDES") && lesson.contentUrl && (
            <a
              href={lesson.contentUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "secondary" }), "mb-4")}
            >
              Open {lesson.kind === "PDF" ? "PDF" : "slides"}
            </a>
          )}
          {lesson.body && <p className="max-w-prose leading-relaxed">{lesson.body}</p>}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="secondary"
            disabled={!prevLesson}
            onClick={() => prevLesson && navigate(`/learn/${slug}/lesson/${prevLesson.id}`)}
          >
            <ArrowLeft aria-hidden="true" />
            Previous
          </Button>

          {isCompleted ? (
            <Button
              variant="secondary"
              onClick={() => nextLesson && navigate(`/learn/${slug}/lesson/${nextLesson.id}`)}
              disabled={!nextLesson}
            >
              Next lesson
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={completeLesson.isPending}>
              <CheckCircle2 aria-hidden="true" />
              {completeLesson.isPending ? "Saving…" : "Mark complete"}
            </Button>
          )}
        </div>
      </article>
    </div>
  );
}
