import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import {
  useAdminCourseTestsQuery,
  useAdminTestQuery,
  useCreateTest,
  useAddQuestion,
} from "../../features/learn/admin-tests-queries";
import { testSchema, questionSchema, QUESTION_KINDS, type TestFormValues, type QuestionFormValues } from "../../lib/schemas/test";
import { Dialog } from "../../components/ui/dialog";
import { Field } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { useToast } from "../../components/ui/toast";
import { ApiError } from "../../lib/api";

export function TestsDialog({
  courseId,
  title,
  onClose,
}: {
  courseId: string;
  title: string;
  onClose: () => void;
}) {
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  return (
    <Dialog
      open
      onClose={onClose}
      title={selectedTestId ? `Questions — ${title}` : `Tests — ${title}`}
      className="max-w-2xl"
    >
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {selectedTestId ? (
          <QuestionsPanel testId={selectedTestId} onBack={() => setSelectedTestId(null)} />
        ) : (
          <TestsListPanel courseId={courseId} onSelect={setSelectedTestId} />
        )}
      </div>
    </Dialog>
  );
}

function TestsListPanel({
  courseId,
  onSelect,
}: {
  courseId: string;
  onSelect: (testId: string) => void;
}) {
  const { data: tests, isLoading } = useAdminCourseTestsQuery(courseId);
  const { toast } = useToast();
  const createTest = useCreateTest();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TestFormValues>({
    resolver: zodResolver(testSchema),
    defaultValues: { passPercent: 70, timeLimitMin: 10, attemptsAllowed: 2 },
  });

  const onSubmit = async (values: TestFormValues) => {
    try {
      await createTest.mutateAsync({ courseId, input: values });
      reset({ title: "", passPercent: 70, timeLimitMin: 10, attemptsAllowed: 2 });
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Couldn't create the test");
    }
  };

  return (
    <div>
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !tests || tests.length === 0 ? (
        <EmptyState title="No tests yet" description="Add one below to start building a question bank." />
      ) : (
        <ul className="space-y-2">
          {tests.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                className="flex w-full items-center justify-between rounded-(--radius-card) border border-border p-3 text-left text-sm hover:border-accent"
              >
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-muted">
                    Pass {t.passPercent}% · {t.timeLimitMin} min · {t.attemptsAllowed} attempts
                  </div>
                </div>
                <Badge variant="outline">
                  {t.questionCount} question{t.questionCount === 1 ? "" : "s"}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-4 flex flex-col gap-3 border-t border-border pt-4"
      >
        <Field label="New test title" error={errors.title?.message}>
          {(props) => <Input {...props} placeholder="e.g. Module 1 Check" {...register("title")} />}
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Pass %" error={errors.passPercent?.message}>
            {(props) => <Input {...props} type="number" min={1} max={100} {...register("passPercent")} />}
          </Field>
          <Field label="Minutes" error={errors.timeLimitMin?.message}>
            {(props) => <Input {...props} type="number" min={1} {...register("timeLimitMin")} />}
          </Field>
          <Field label="Attempts" error={errors.attemptsAllowed?.message}>
            {(props) => <Input {...props} type="number" min={1} {...register("attemptsAllowed")} />}
          </Field>
        </div>
        <Button type="submit" disabled={isSubmitting} className="self-end">
          <Plus aria-hidden="true" />
          Add test
        </Button>
      </form>
    </div>
  );
}

function QuestionsPanel({ testId, onBack }: { testId: string; onBack: () => void }) {
  const { data: test, isLoading } = useAdminTestQuery(testId);
  const { toast } = useToast();
  const addQuestion = useAddQuestion();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      kind: "SINGLE",
      options: [
        { label: "", correct: false },
        { label: "", correct: false },
      ],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "options" });
  const kind = watch("kind");
  const optionValues = watch("options");

  const toggleCorrect = (index: number) => {
    if (kind === "MULTI") {
      setValue(`options.${index}.correct`, !optionValues[index]?.correct, { shouldValidate: true });
      return;
    }
    optionValues.forEach((_, i) => setValue(`options.${i}.correct`, i === index, { shouldValidate: true }));
  };

  const onSubmit = async (values: QuestionFormValues) => {
    try {
      await addQuestion.mutateAsync({ testId, input: values });
      reset({
        prompt: "",
        kind: "SINGLE",
        options: [
          { label: "", correct: false },
          { label: "", correct: false },
        ],
      });
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Couldn't add the question");
    }
  };

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        Back to tests
      </Button>

      {isLoading ? (
        <Skeleton className="mt-4 h-24 w-full" />
      ) : (
        <ol className="mt-4 space-y-3">
          {test?.questions.map((q, i) => (
            <li key={q.id} className="rounded-(--radius-card) border border-border p-3">
              <p className="font-medium">
                {i + 1}. {q.prompt}{" "}
                <span className="font-normal text-muted">({q.kind})</span>
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {q.options.map((o) => (
                  <li key={o.id} className="flex items-center gap-2">
                    {o.correct ? (
                      <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                    ) : (
                      <Circle className="size-4 text-muted" aria-hidden="true" />
                    )}
                    {o.label}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-4 flex flex-col gap-3 border-t border-border pt-4"
      >
        <Field label="Question prompt" error={errors.prompt?.message}>
          {(props) => <Input {...props} {...register("prompt")} />}
        </Field>
        <Field label="Kind" error={errors.kind?.message}>
          {(props) => (
            <Select {...props} className="w-40" {...register("kind")}>
              {QUESTION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div>
          <span className="text-sm font-medium">Options</span>
          <div className="mt-1.5 space-y-2">
            {fields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2">
                <input
                  type={kind === "MULTI" ? "checkbox" : "radio"}
                  name={kind === "MULTI" ? undefined : "correct-option"}
                  checked={optionValues[i]?.correct ?? false}
                  onChange={() => toggleCorrect(i)}
                  className="size-4 accent-accent"
                  aria-label={`Option ${i + 1} is correct`}
                />
                <Input
                  {...register(`options.${i}.label`)}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove option ${i + 1}`}
                  disabled={fields.length <= 2}
                  onClick={() => remove(i)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
          {errors.options?.message && (
            <p role="alert" className="mt-1.5 text-sm text-danger">
              {errors.options.message}
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => append({ label: "", correct: false })}
          >
            <Plus aria-hidden="true" />
            Add option
          </Button>
        </div>

        <Button type="submit" disabled={isSubmitting} className="self-end">
          Add question
        </Button>
      </form>
    </div>
  );
}
