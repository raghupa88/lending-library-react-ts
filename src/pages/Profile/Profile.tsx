import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../../context/AuthContext";
import { useProfileQuery, useUpdateProfile } from "../../features/users/queries";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Field } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { useToast } from "../../components/ui/toast";
import { ApiError } from "../../lib/api";

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name"),
  lastName: z.string().trim().min(1, "Enter your last name"),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,14}$/, "Enter a valid phone number")
    .or(z.literal(""))
    .optional(),
  address: z.string().trim().max(200, "Keep the address under 200 characters").optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user, updateProfile: updateAuthUser } = useAuth();
  const { toast } = useToast();
  const { data: profile, isLoading } = useProfileQuery(user?.id);
  const updateProfile = useUpdateProfile(user?.id);

  const [firstName = "", ...rest] = (profile?.name ?? "").split(" ");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: profile
      ? {
          firstName,
          lastName: rest.join(" "),
          phone: profile.phone ?? "",
          address: profile.address ?? "",
        }
      : undefined,
  });

  const onSubmit = (values: ProfileFormValues) =>
    updateProfile.mutateAsync(values, {
      onSuccess: (updated) => {
        updateAuthUser({ name: updated.name });
        toast("success", "Profile saved");
      },
      onError: (err) =>
        toast("error", err instanceof ApiError ? err.message : "Couldn't save your profile"),
    });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Your profile</h1>
      <p className="mt-1 text-muted">
        Contact and delivery details for your library membership.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-display">Account</CardTitle>
          <p className="text-sm text-muted">
            Signed in as <span className="font-medium text-foreground">{user.email}</span> —
            email can't be changed.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" error={errors.firstName?.message}>
                  {(props) => (
                    <Input {...props} autoComplete="given-name" {...register("firstName")} />
                  )}
                </Field>
                <Field label="Last name" error={errors.lastName?.message}>
                  {(props) => (
                    <Input {...props} autoComplete="family-name" {...register("lastName")} />
                  )}
                </Field>
              </div>

              <Field
                label="Phone"
                optional
                error={errors.phone?.message}
                hint="Used for delivery updates on premium plans"
              >
                {(props) => (
                  <Input
                    {...props}
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    {...register("phone")}
                  />
                )}
              </Field>

              <Field label="Delivery address" optional error={errors.address?.message}>
                {(props) => (
                  <Textarea
                    {...props}
                    rows={2}
                    autoComplete="street-address"
                    placeholder="House, street, city, PIN"
                    {...register("address")}
                  />
                )}
              </Field>

              <div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
