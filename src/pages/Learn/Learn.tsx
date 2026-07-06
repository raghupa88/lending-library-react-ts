import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { GraduationCap, Clock, BookOpen } from "lucide-react";
import { useCoursesQuery, type CourseTrack, type CourseLevel } from "../../features/learn/queries";
import { TRACK_LABELS, LEVEL_LABELS } from "../../features/learn/labels";
import { Select } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { Button } from "../../components/ui/button";

const TRACKS = Object.keys(TRACK_LABELS) as CourseTrack[];
const LEVELS = Object.keys(LEVEL_LABELS) as CourseLevel[];

export default function Learn() {
  const [params, setParams] = useSearchParams();
  const track = (params.get("track") ?? "") as CourseTrack | "";
  const level = (params.get("level") ?? "") as CourseLevel | "";

  const updateParam = (key: string, value: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const { data, isLoading, isError } = useCoursesQuery({
    track: track || undefined,
    level: level || undefined,
    size: 20,
  });

  const courses = data?.content ?? [];
  const hasFilters = Boolean(track || level);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="size-8 text-accent" aria-hidden="true" />
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Suvadi Learn</h1>
          <p className="mt-1 text-muted">
            Practical courses on saving, investing, and the capital markets — taught plainly.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Select
          aria-label="Filter by track"
          value={track}
          onChange={(e) => updateParam("track", e.target.value)}
          className="w-52"
        >
          <option value="">All tracks</option>
          {TRACKS.map((t) => (
            <option key={t} value={t}>
              {TRACK_LABELS[t]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by level"
          value={level}
          onChange={(e) => updateParam("level", e.target.value)}
          className="w-40"
        >
          <option value="">All levels</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABELS[l]}
            </option>
          ))}
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => setParams({})}>
            Clear filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-48 w-full" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <EmptyState
          className="mt-8"
          icon={<GraduationCap aria-hidden="true" />}
          title="Couldn't load the course catalog"
          description="Something went wrong. Try again in a moment."
        />
      ) : courses.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<GraduationCap aria-hidden="true" />}
          title="No courses match"
          description="Try a different track or level, or check back soon — new courses are on the way."
        />
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <li key={course.id}>
              <Link
                to={`/learn/${course.slug}`}
                className="flex h-full flex-col rounded-(--radius-card) border border-border bg-surface p-5 transition-colors hover:border-accent"
              >
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{TRACK_LABELS[course.track]}</Badge>
                  <Badge variant="outline">{LEVEL_LABELS[course.level]}</Badge>
                </div>
                <h2 className="mt-3 font-display text-lg font-semibold">{course.title}</h2>
                <p className="mt-1.5 line-clamp-3 text-sm text-muted">{course.summary}</p>
                <div className="mt-auto flex items-center gap-4 pt-4 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <BookOpen className="size-3.5" aria-hidden="true" />
                    {course.lessonCount} lesson{course.lessonCount === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" aria-hidden="true" />
                    {course.moduleCount} module{course.moduleCount === 1 ? "" : "s"}
                  </span>
                  {course.price === 0 ? (
                    <Badge variant="success" className="ml-auto">
                      Free
                    </Badge>
                  ) : (
                    <span className="ml-auto font-medium text-foreground">
                      ₹{course.price.toFixed(0)}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
