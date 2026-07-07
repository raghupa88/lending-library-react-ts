import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Library, Eye, EyeOff, ClipboardCheck } from "lucide-react";
import {
  useAdminCoursesQuery,
  useCreateCourse,
  useUpdateCourse,
  useSetCoursePublished,
  type CourseInput,
} from "../../features/learn/admin-queries";
import type { CourseSummary } from "../../features/learn/queries";
import { TRACK_LABELS, LEVEL_LABELS } from "../../features/learn/labels";
import { courseSchema, type CourseFormValues } from "../../lib/schemas/course";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { Field } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { useToast } from "../../components/ui/toast";
import { ApiError } from "../../lib/api";
import { SyllabusDialog } from "./SyllabusDialog";
import { TestsDialog } from "./TestsDialog";

type FormDialogState = { mode: "create" } | { mode: "edit"; course: CourseSummary } | null;

export default function CoursesAdmin() {
  const [formDialog, setFormDialog] = useState<FormDialogState>(null);
  const [syllabusFor, setSyllabusFor] = useState<CourseSummary | null>(null);
  const [testsFor, setTestsFor] = useState<CourseSummary | null>(null);
  const { data: courses, isLoading } = useAdminCoursesQuery();
  const setPublished = useSetCoursePublished();
  const { toast } = useToast();

  const togglePublished = (course: CourseSummary) => {
    setPublished.mutate(
      { id: course.id, published: course.status !== "PUBLISHED" },
      {
        onSuccess: () =>
          toast(
            "success",
            course.status === "PUBLISHED"
              ? `"${course.title}" reverted to draft`
              : `"${course.title}" published`,
          ),
        onError: (err) =>
          toast("error", err instanceof ApiError ? err.message : "Couldn't update the course"),
      },
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Courses</h1>
          <p className="mt-1 text-sm text-muted">
            {courses ? `${courses.length} course${courses.length === 1 ? "" : "s"}` : "Loading…"}
          </p>
        </div>
        <Button onClick={() => setFormDialog({ mode: "create" })}>
          <Plus aria-hidden="true" />
          Add course
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="mt-6 h-64 w-full" />
      ) : !courses || courses.length === 0 ? (
        <EmptyState className="mt-6" title="No courses yet" />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-(--radius-card) border border-border bg-surface">
          <table className="w-full min-w-180 text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted uppercase">
                <th scope="col" className="px-4 py-3 font-medium">Title</th>
                <th scope="col" className="px-4 py-3 font-medium">Track</th>
                <th scope="col" className="px-4 py-3 font-medium">Level</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Syllabus</th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {courses.map((course) => (
                <tr key={course.id}>
                  <td className="px-4 py-3 font-medium">{course.title}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{TRACK_LABELS[course.track]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">{LEVEL_LABELS[course.level]}</td>
                  <td className="px-4 py-3">
                    <Badge variant={course.status === "PUBLISHED" ? "success" : "outline"}>
                      {course.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {course.moduleCount} module{course.moduleCount === 1 ? "" : "s"}, {course.lessonCount}{" "}
                    lesson{course.lessonCount === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Manage syllabus for ${course.title}`}
                        onClick={() => setSyllabusFor(course)}
                      >
                        <Library aria-hidden="true" />
                        Syllabus
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Manage tests for ${course.title}`}
                        onClick={() => setTestsFor(course)}
                      >
                        <ClipboardCheck aria-hidden="true" />
                        Tests
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${course.title}`}
                        onClick={() => setFormDialog({ mode: "edit", course })}
                      >
                        <Pencil aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={
                          course.status === "PUBLISHED"
                            ? `Unpublish ${course.title}`
                            : `Publish ${course.title}`
                        }
                        disabled={setPublished.isPending}
                        onClick={() => togglePublished(course)}
                      >
                        {course.status === "PUBLISHED" ? (
                          <>
                            <EyeOff aria-hidden="true" />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <Eye aria-hidden="true" />
                            Publish
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formDialog && <CourseFormDialog state={formDialog} onClose={() => setFormDialog(null)} />}
      {syllabusFor && (
        <SyllabusDialog courseId={syllabusFor.id} title={syllabusFor.title} onClose={() => setSyllabusFor(null)} />
      )}
      {testsFor && (
        <TestsDialog courseId={testsFor.id} title={testsFor.title} onClose={() => setTestsFor(null)} />
      )}
    </div>
  );
}

function CourseFormDialog({
  state,
  onClose,
}: {
  state: FormDialogState & object;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const editing = state.mode === "edit" ? state.course : null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: editing
      ? {
          slug: editing.slug,
          title: editing.title,
          track: editing.track,
          level: editing.level,
          language: editing.language,
          summary: editing.summary,
          price: editing.price,
        }
      : { track: "MONEY_FOUNDATIONS", level: "BEGINNER", language: "English", price: 0 },
  });

  const onSubmit = async (values: CourseFormValues) => {
    const input: CourseInput = { ...values };
    try {
      if (editing) {
        await updateCourse.mutateAsync({ id: editing.id, input });
        toast("success", `Updated "${values.title}"`);
      } else {
        await createCourse.mutateAsync(input);
        toast("success", `Added "${values.title}" as a draft`);
      }
      onClose();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Couldn't save the course");
    }
  };

  return (
    <Dialog open onClose={onClose} title={editing ? `Edit ${editing.title}` : "Add a course"} className="max-w-xl">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Field label="Title" error={errors.title?.message}>
          {(props) => <Input {...props} {...register("title")} />}
        </Field>
        <Field label="Slug" hint="Used in the course URL, e.g. money-foundations" error={errors.slug?.message}>
          {(props) => <Input {...props} {...register("slug")} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Track" error={errors.track?.message}>
            {(props) => (
              <Select {...props} {...register("track")}>
                {(Object.keys(TRACK_LABELS) as (keyof typeof TRACK_LABELS)[]).map((t) => (
                  <option key={t} value={t}>
                    {TRACK_LABELS[t]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Level" error={errors.level?.message}>
            {(props) => (
              <Select {...props} {...register("level")}>
                {(Object.keys(LEVEL_LABELS) as (keyof typeof LEVEL_LABELS)[]).map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_LABELS[l]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Language" error={errors.language?.message}>
            {(props) => <Input {...props} {...register("language")} />}
          </Field>
          <Field label="Price (₹)" hint="0 for a free course" error={errors.price?.message}>
            {(props) => <Input {...props} type="number" min={0} step="0.01" {...register("price")} />}
          </Field>
        </div>
        <Field label="Summary" error={errors.summary?.message}>
          {(props) => <Textarea {...props} rows={3} {...register("summary")} />}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : editing ? "Save changes" : "Add course"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
