import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil } from "lucide-react";
import {
  useVenuesQuery,
  useCreateVenue,
  useUpdateVenue,
  type Venue,
  type VenueInput,
} from "../../features/learn/admin-batches-queries";
import { venueSchema, type VenueFormValues } from "../../lib/schemas/batch";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { Field } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { useToast } from "../../components/ui/toast";
import { ApiError } from "../../lib/api";

type DialogState = { mode: "create" } | { mode: "edit"; venue: Venue } | null;

export default function VenuesAdmin() {
  const [dialog, setDialog] = useState<DialogState>(null);
  const { data: venues, isLoading } = useVenuesQuery();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Venues</h1>
          <p className="mt-1 text-sm text-muted">
            {venues ? `${venues.length} venue${venues.length === 1 ? "" : "s"}` : "Loading…"}
          </p>
        </div>
        <Button onClick={() => setDialog({ mode: "create" })}>
          <Plus aria-hidden="true" />
          Add venue
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="mt-6 h-64 w-full" />
      ) : !venues || venues.length === 0 ? (
        <EmptyState className="mt-6" title="No venues yet" description="Add a venue to start scheduling in-person batches." />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-(--radius-card) border border-border bg-surface">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted uppercase">
                <th scope="col" className="px-4 py-3 font-medium">Name</th>
                <th scope="col" className="px-4 py-3 font-medium">City</th>
                <th scope="col" className="px-4 py-3 font-medium">Address</th>
                <th scope="col" className="px-4 py-3 font-medium">Default capacity</th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {venues.map((venue) => (
                <tr key={venue.id}>
                  <td className="px-4 py-3 font-medium">{venue.name}</td>
                  <td className="px-4 py-3 text-muted">{venue.city}</td>
                  <td className="px-4 py-3 text-muted">{venue.address ?? "—"}</td>
                  <td className="px-4 py-3">{venue.capacityDefault}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit ${venue.name}`}
                      onClick={() => setDialog({ mode: "edit", venue })}
                    >
                      <Pencil aria-hidden="true" />
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog && <VenueFormDialog state={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}

function VenueFormDialog({ state, onClose }: { state: DialogState & object; onClose: () => void }) {
  const { toast } = useToast();
  const createVenue = useCreateVenue();
  const updateVenue = useUpdateVenue();
  const editing = state.mode === "edit" ? state.venue : null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VenueFormValues>({
    resolver: zodResolver(venueSchema),
    defaultValues: editing
      ? {
          name: editing.name,
          address: editing.address ?? "",
          city: editing.city,
          capacityDefault: editing.capacityDefault,
        }
      : { capacityDefault: 20 },
  });

  const onSubmit = async (values: VenueFormValues) => {
    const input: VenueInput = { ...values, address: values.address || undefined };
    try {
      if (editing) {
        await updateVenue.mutateAsync({ id: editing.id, input });
        toast("success", `Updated "${values.name}"`);
      } else {
        await createVenue.mutateAsync(input);
        toast("success", `Added "${values.name}"`);
      }
      onClose();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Couldn't save the venue");
    }
  };

  return (
    <Dialog open onClose={onClose} title={editing ? `Edit ${editing.name}` : "Add a venue"} className="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Field label="Name" error={errors.name?.message}>
          {(props) => <Input {...props} {...register("name")} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" error={errors.city?.message}>
            {(props) => <Input {...props} {...register("city")} />}
          </Field>
          <Field label="Default capacity" error={errors.capacityDefault?.message}>
            {(props) => <Input {...props} type="number" min={1} {...register("capacityDefault")} />}
          </Field>
        </div>
        <Field label="Address" optional error={errors.address?.message}>
          {(props) => <Input {...props} {...register("address")} />}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : editing ? "Save changes" : "Add venue"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
