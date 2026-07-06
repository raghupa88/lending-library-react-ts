import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useAdminCourseQuery, useAddModule, useAddLesson } from "../../features/learn/admin-queries";
import {
  moduleSchema,
  lessonSchema,
  LESSON_KINDS,
  type ModuleFormValues,
  type LessonFormValues,
} from "../../lib/schemas/course";
import { Dialog } from "../../components/ui/dialog";
import { Field } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { useToast } from "../../components/ui/toast";
import { ApiError } from "../../lib/api";

export function SyllabusDialog({
  courseId,
  title,
  onClose,
}: {
  courseId: string;
  title: string;
  onClose: () => void;
}) {
  const { data: course, isLoading } = useAdminCourseQuery(courseId);
  const [lessonFormFor, setLessonFormFor] = useState<string | null>(null);

  return (
    <Dialog open onClose={onClose} title={`Syllabus — ${title}`} className="max-w-2xl">
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <ol className="space-y-4">
            {course?.modules.map((module, i) => (
              <li key={module.id} className="rounded-(--radius-card) border border-border p-4">
                <h3 className="font-medium">
                  <span className="text-muted">Module {i + 1}: </span>
                  {module.title}
                </h3>
                {module.lessons.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-muted">
                    {module.lessons.map((lesson) => (
                      <li key={lesson.id}>
                        {lesson.title} · {lesson.kind} · {lesson.estMinutes} min
                      </li>
                    ))}
                  </ul>
                )}
                {lessonFormFor === module.id ? (
                  <LessonForm
                    moduleId={module.id}
                    onDone={() => setLessonFormFor(null)}
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setLessonFormFor(module.id)}
                  >
                    <Plus aria-hidden="true" />
                    Add lesson
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}

        <ModuleForm courseId={courseId} />
      </div>
    </Dialog>
  );
}

function ModuleForm({ courseId }: { courseId: string }) {
  const { toast } = useToast();
  const addModule = useAddModule();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ModuleFormValues>({ resolver: zodResolver(moduleSchema) });

  const onSubmit = async (values: ModuleFormValues) => {
    try {
      await addModule.mutateAsync({ courseId, input: values });
      reset();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Couldn't add the module");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mt-4 flex items-end gap-2 border-t border-border pt-4"
    >
      <Field label="New module title" error={errors.title?.message} className="flex-1">
        {(props) => <Input {...props} placeholder="e.g. Reading a balance sheet" {...register("title")} />}
      </Field>
      <Button type="submit" disabled={isSubmitting}>
        <Plus aria-hidden="true" />
        Add module
      </Button>
    </form>
  );
}

function LessonForm({ moduleId, onDone }: { moduleId: string; onDone: () => void }) {
  const { toast } = useToast();
  const addLesson = useAddLesson();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { kind: "ARTICLE", estMinutes: 10 },
  });

  const onSubmit = async (values: LessonFormValues) => {
    try {
      await addLesson.mutateAsync({
        moduleId,
        input: {
          ...values,
          contentUrl: values.contentUrl || undefined,
          body: values.body || undefined,
        },
      });
      onDone();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Couldn't add the lesson");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-3 flex flex-col gap-3 rounded-(--radius-control) bg-surface-2 p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <Field label="Lesson title" error={errors.title?.message}>
          {(props) => <Input {...props} {...register("title")} />}
        </Field>
        <Field label="Kind" error={errors.kind?.message}>
          {(props) => (
            <Select {...props} className="w-32" {...register("kind")}>
              {LESSON_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Minutes" error={errors.estMinutes?.message}>
          {(props) => <Input {...props} type="number" min={1} className="w-24" {...register("estMinutes")} />}
        </Field>
      </div>
      <Field label="Content URL" optional error={errors.contentUrl?.message}>
        {(props) => <Input {...props} type="url" {...register("contentUrl")} />}
      </Field>
      <Field label="Body" optional error={errors.body?.message}>
        {(props) => <Textarea {...props} rows={2} {...register("body")} />}
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding…" : "Add lesson"}
        </Button>
      </div>
    </form>
  );
}
