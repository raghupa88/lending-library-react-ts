import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";
import {
  useAdminCourseBatchesQuery,
  useAdminBatchQuery,
  useVenuesQuery,
  useCreateBatch,
  usePublishBatch,
  useCancelBatch,
  useMarkAttendance,
  type AdminBatchSummary,
} from "../../features/learn/admin-batches-queries";
import { batchSchema, type BatchFormValues } from "../../lib/schemas/batch";
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

export function BatchesDialog({
  courseId,
  title,
  onClose,
}: {
  courseId: string;
  title: string;
  onClose: () => void;
}) {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  return (
    <Dialog
      open
      onClose={onClose}
      title={selectedBatchId ? `Batch detail — ${title}` : `Batches — ${title}`}
      className="max-w-2xl"
    >
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {selectedBatchId ? (
          <BatchDetailPanel batchId={selectedBatchId} onBack={() => setSelectedBatchId(null)} />
        ) : (
          <BatchListPanel courseId={courseId} onSelect={setSelectedBatchId} />
        )}
      </div>
    </Dialog>
  );
}

function statusVariant(status: AdminBatchSummary["status"]) {
  if (status === "PUBLISHED") return "success" as const;
  if (status === "CANCELLED") return "danger" as const;
  return "outline" as const;
}

function BatchListPanel({
  courseId,
  onSelect,
}: {
  courseId: string;
  onSelect: (batchId: string) => void;
}) {
  const { data: batches, isLoading } = useAdminCourseBatchesQuery(courseId);
  const { data: venues } = useVenuesQuery();
  const { toast } = useToast();
  const createBatch = useCreateBatch();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      capacity: 20,
      fee: 0,
      sessions: [{ sessionDate: "", topic: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "sessions" });

  const onSubmit = async (values: BatchFormValues) => {
    try {
      await createBatch.mutateAsync({ courseId, input: values });
      reset({
        venueId: "",
        instructorName: "",
        startsOn: "",
        endsOn: "",
        scheduleText: "",
        capacity: 20,
        fee: 0,
        sessions: [{ sessionDate: "", topic: "" }],
      });
      toast("success", "Batch created as a draft");
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Couldn't create the batch");
    }
  };

  return (
    <div>
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !batches || batches.length === 0 ? (
        <EmptyState title="No batches yet" description="Schedule one below." />
      ) : (
        <ul className="space-y-2">
          {batches.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onSelect(b.id)}
                className="flex w-full items-center justify-between gap-3 rounded-(--radius-card) border border-border p-3 text-left text-sm hover:border-accent"
              >
                <div>
                  <div className="font-medium">
                    {b.venueName} · {b.instructorName}
                  </div>
                  <div className="text-muted">
                    {b.startsOn} – {b.endsOn} · {b.scheduleText}
                  </div>
                  <div className="text-muted">
                    {b.confirmedCount}/{b.capacity} confirmed
                    {b.waitlistedCount > 0 ? `, ${b.waitlistedCount} waitlisted` : ""}
                  </div>
                </div>
                <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
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
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Venue" error={errors.venueId?.message}>
            {(props) => (
              <Select {...props} {...register("venueId")}>
                <option value="">Select a venue</option>
                {venues?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.city})
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Instructor" error={errors.instructorName?.message}>
            {(props) => <Input {...props} {...register("instructorName")} />}
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Starts on" error={errors.startsOn?.message}>
            {(props) => <Input {...props} type="date" {...register("startsOn")} />}
          </Field>
          <Field label="Ends on" error={errors.endsOn?.message}>
            {(props) => <Input {...props} type="date" {...register("endsOn")} />}
          </Field>
        </div>
        <Field label="Schedule" hint="e.g. Sat-Sun, 10am-1pm" error={errors.scheduleText?.message}>
          {(props) => <Input {...props} {...register("scheduleText")} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Capacity" error={errors.capacity?.message}>
            {(props) => <Input {...props} type="number" min={1} {...register("capacity")} />}
          </Field>
          <Field label="Fee (₹)" hint="0 for free" error={errors.fee?.message}>
            {(props) => <Input {...props} type="number" min={0} step="0.01" {...register("fee")} />}
          </Field>
        </div>

        <div>
          <span className="text-sm font-medium">Sessions</span>
          <div className="mt-1.5 space-y-2">
            {fields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  type="date"
                  aria-label={`Session ${i + 1} date`}
                  {...register(`sessions.${i}.sessionDate`)}
                  className="w-40"
                />
                <Input
                  {...register(`sessions.${i}.topic`)}
                  placeholder={`Topic for session ${i + 1}`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove session ${i + 1}`}
                  disabled={fields.length <= 1}
                  onClick={() => remove(i)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
          {errors.sessions?.message && (
            <p role="alert" className="mt-1.5 text-sm text-danger">
              {errors.sessions.message}
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => append({ sessionDate: "", topic: "" })}
          >
            <Plus aria-hidden="true" />
            Add session
          </Button>
        </div>

        <Button type="submit" disabled={isSubmitting} className="self-end">
          Schedule batch
        </Button>
      </form>
    </div>
  );
}

function BatchDetailPanel({ batchId, onBack }: { batchId: string; onBack: () => void }) {
  const { data: batch, isLoading } = useAdminBatchQuery(batchId);
  const { toast } = useToast();
  const publishBatch = usePublishBatch();
  const cancelBatch = useCancelBatch();
  const markAttendance = useMarkAttendance();

  if (isLoading || !batch) {
    return <Skeleton className="h-48 w-full" />;
  }

  const confirmedRoster = batch.roster.filter((r) => r.status !== "CANCELLED");

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        Back to batches
      </Button>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">
            {batch.venueName} · {batch.instructorName}
          </p>
          <p className="text-sm text-muted">
            {batch.startsOn} – {batch.endsOn} · {batch.scheduleText}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(batch.status)}>{batch.status}</Badge>
          {batch.status === "DRAFT" && (
            <Button
              size="sm"
              disabled={publishBatch.isPending}
              onClick={() =>
                publishBatch.mutate(batchId, {
                  onSuccess: () => toast("success", "Batch published"),
                  onError: (err) =>
                    toast("error", err instanceof ApiError ? err.message : "Couldn't publish"),
                })
              }
            >
              Publish
            </Button>
          )}
          {batch.status !== "CANCELLED" && (
            <Button
              size="sm"
              variant="ghost"
              disabled={cancelBatch.isPending}
              onClick={() =>
                cancelBatch.mutate(batchId, {
                  onSuccess: () => toast("success", "Batch cancelled"),
                  onError: (err) =>
                    toast("error", err instanceof ApiError ? err.message : "Couldn't cancel"),
                })
              }
            >
              Cancel batch
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold">Sessions</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {batch.sessions.map((s) => (
            <li key={s.id} className="rounded-(--radius-card) border border-border p-2">
              {s.sessionDate} — {s.topic}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold">Roster</h3>
        {batch.roster.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No bookings yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {batch.roster.map((r) => (
              <li
                key={r.bookingId}
                className="flex items-center justify-between rounded-(--radius-card) border border-border p-2"
              >
                <div>
                  <span className="font-medium">{r.userName}</span>{" "}
                  <span className="text-muted">{r.userEmail}</span>
                </div>
                <Badge
                  variant={
                    r.status === "CONFIRMED" ? "success" : r.status === "WAITLISTED" ? "outline" : "danger"
                  }
                >
                  {r.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirmedRoster.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">Attendance</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-100 text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted uppercase">
                  <th scope="col" className="py-2 font-medium">Learner</th>
                  {batch.sessions.map((s) => (
                    <th key={s.id} scope="col" className="py-2 font-medium">
                      {s.sessionDate}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {confirmedRoster.map((r) => (
                  <tr key={r.bookingId}>
                    <td className="py-2">{r.userName}</td>
                    {batch.sessions.map((s) => (
                      <td key={s.id} className="py-2">
                        <button
                          type="button"
                          aria-label={`Toggle attendance for ${r.userName} on ${s.sessionDate}`}
                          onClick={() =>
                            markAttendance.mutate(
                              { sessionId: s.id, userId: r.userId, present: true, batchId },
                              {
                                onError: (err) =>
                                  toast(
                                    "error",
                                    err instanceof ApiError ? err.message : "Couldn't mark attendance",
                                  ),
                              },
                            )
                          }
                          className="rounded-(--radius-control) p-1 text-muted hover:text-success"
                        >
                          <CheckCircle2 className="size-5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Mark ${r.userName} absent on ${s.sessionDate}`}
                          onClick={() =>
                            markAttendance.mutate(
                              { sessionId: s.id, userId: r.userId, present: false, batchId },
                              {
                                onError: (err) =>
                                  toast(
                                    "error",
                                    err instanceof ApiError ? err.message : "Couldn't mark attendance",
                                  ),
                              },
                            )
                          }
                          className="rounded-(--radius-control) p-1 text-muted hover:text-danger"
                        >
                          <XCircle className="size-5" aria-hidden="true" />
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
