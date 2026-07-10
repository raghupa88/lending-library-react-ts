import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import {
  useAdminFeatureFlagsQuery,
  useCreateFeatureFlag,
  useSetFeatureFlagEnabled,
} from "../../features/feature-flags/queries";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Dialog } from "../../components/ui/dialog";
import { Field } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { useToast } from "../../components/ui/toast";
import { ApiError } from "../../lib/api";

const flagSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Enter a key")
    .regex(/^[a-z][a-z0-9_]*$/, "Lowercase snake_case, e.g. b2b_tier"),
  name: z.string().trim().min(1, "Enter a name"),
  description: z.string().trim().optional(),
});
type FlagFormValues = z.infer<typeof flagSchema>;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function FeatureFlagsAdmin() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { data: flags, isLoading } = useAdminFeatureFlagsQuery();
  const setEnabled = useSetFeatureFlagEnabled();

  const handleToggle = (key: string, enabled: boolean) => {
    setEnabled.mutate(
      { key, enabled },
      {
        onSuccess: () => toast("success", enabled ? `Enabled "${key}"` : `Disabled "${key}"`),
        onError: (err) => toast("error", err instanceof ApiError ? err.message : "Couldn't update the flag"),
      },
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Feature flags</h1>
          <p className="mt-1 text-sm text-muted">
            Global on/off switches — turning one off doesn&apos;t affect users already using the feature,
            only new purchases/signups going forward.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus aria-hidden="true" />
          Add flag
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="mt-6 h-48 w-full" />
      ) : !flags || flags.length === 0 ? (
        <EmptyState className="mt-6" title="No feature flags yet" description="Add one to get started." />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-(--radius-card) border border-border bg-surface">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted uppercase">
                <th scope="col" className="px-4 py-3 font-medium">Key</th>
                <th scope="col" className="px-4 py-3 font-medium">Name</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Updated</th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {flags.map((flag) => (
                <tr key={flag.id}>
                  <td className="px-4 py-3 font-mono text-xs">{flag.key}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{flag.name}</div>
                    {flag.description && <div className="text-xs text-muted">{flag.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {flag.enabled ? (
                      <Badge variant="success">Enabled</Badge>
                    ) : (
                      <Badge variant="outline">Disabled</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(flag.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={setEnabled.isPending}
                      onClick={() => handleToggle(flag.key, !flag.enabled)}
                    >
                      {flag.enabled ? "Disable" : "Enable"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && <CreateFlagDialog onClose={() => setDialogOpen(false)} />}
    </div>
  );
}

function CreateFlagDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const createFlag = useCreateFeatureFlag();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FlagFormValues>({ resolver: zodResolver(flagSchema) });

  const onSubmit = async (values: FlagFormValues) => {
    try {
      await createFlag.mutateAsync({ ...values, description: values.description || undefined });
      toast("success", `Added "${values.key}" (disabled by default)`);
      onClose();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Couldn't create the flag");
    }
  };

  return (
    <Dialog open onClose={onClose} title="Add a feature flag" className="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Field label="Key" error={errors.key?.message}>
          {(props) => <Input {...props} placeholder="e.g. b2b_tier" {...register("key")} />}
        </Field>
        <Field label="Name" error={errors.name?.message}>
          {(props) => <Input {...props} placeholder="e.g. B2B tier" {...register("name")} />}
        </Field>
        <Field label="Description" optional error={errors.description?.message}>
          {(props) => <Input {...props} {...register("description")} />}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding…" : "Add flag"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
