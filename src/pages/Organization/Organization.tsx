import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Copy, UserMinus } from "lucide-react";
import { usePlansQuery, formatMaxBooks, type Plan, type BillingCycle } from "../../features/subscriptions/queries";
import {
  useMyOrganizationQuery,
  usePurchaseOrganization,
  useJoinOrganization,
  useRemoveMember,
} from "../../features/organizations/queries";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Field } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { Tabs } from "../../components/ui/tabs";
import { StatCard } from "../../components/ui/stat-card";
import { CheckoutDialog } from "../../components/payments/CheckoutDialog";
import { useToast } from "../../components/ui/toast";
import { ApiError } from "../../lib/api";
import type { PaymentInput } from "../../lib/payment";
import { cn } from "../../lib/cn";

const purchaseSchema = z.object({
  name: z.string().trim().min(2, "Enter your school or company name"),
  seatCount: z.coerce.number<number>().int().min(1, "At least 1 seat"),
});
type PurchaseFormValues = z.infer<typeof purchaseSchema>;

const joinSchema = z.object({
  joinCode: z.string().trim().min(1, "Enter an organization code"),
});
type JoinFormValues = z.infer<typeof joinSchema>;

export default function Organization() {
  const { toast } = useToast();
  const [mode, setMode] = useState<"start" | "join">("start");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);

  const { data: org, isLoading: orgLoading } = useMyOrganizationQuery();
  const { data: plans, isLoading: plansLoading } = usePlansQuery();
  const purchaseOrg = usePurchaseOrganization();
  const joinOrg = useJoinOrganization();
  const removeMember = useRemoveMember();

  const purchaseForm = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: { seatCount: 10 },
  });
  const joinForm = useForm<JoinFormValues>({ resolver: zodResolver(joinSchema) });

  const isAnnual = billingCycle === "annual";

  const handleCheckoutSubmit = async (payment: PaymentInput) => {
    if (!checkoutPlan) return;
    const { name, seatCount } = purchaseForm.getValues();
    const created = await purchaseOrg.mutateAsync({
      name,
      plan: checkoutPlan.id,
      billingCycle,
      seatCount,
      payment,
    });
    setCheckoutPlan(null);
    toast("success", `Business account created! Charged ₹${created.amountPaid.toFixed(2)}`);
  };

  const onJoin = async (values: JoinFormValues) => {
    try {
      const sub = await joinOrg.mutateAsync(values.joinCode);
      joinForm.reset();
      toast("success", `Joined! You're now on the ${sub.plan} plan.`);
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Couldn't join with that code");
    }
  };

  const handleRemove = (userId: string, name: string) => {
    removeMember.mutate(userId, {
      onSuccess: () => toast("success", `Removed ${name} from your organization`),
      onError: (err) =>
        toast("error", err instanceof ApiError ? err.message : "Couldn't remove that member"),
    });
  };

  const joinLink = (code: string) => `${window.location.origin}/register?org=${code}`;

  if (orgLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-48 w-full" />
      </div>
    );
  }

  if (org) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="text-center">
          <Building2 className="mx-auto size-10 text-accent" aria-hidden="true" />
          <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{org.name}</h1>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Your business account — share the join code below with your team.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="Plan" value={org.plan} />
          <StatCard label="Billing" value={org.billingCycle} />
          <StatCard label="Seats used" value={`${org.seatsUsed} / ${org.seatsTotal}`} />
        </div>

        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted">Share this code or link with your team:</p>
            <code className="rounded-(--radius-control) bg-surface-2 px-3 py-2 font-mono text-lg">
              {org.joinCode}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(joinLink(org.joinCode));
                  toast("success", "Join link copied");
                } catch {
                  toast("error", "Couldn't copy the link");
                }
              }}
            >
              <Copy className="size-4" aria-hidden="true" />
              Copy join link
            </Button>
          </CardContent>
        </Card>

        <div className="mt-10">
          <h2 className="font-display text-xl font-semibold">Members</h2>
          {org.members.length === 0 ? (
            <EmptyState
              className="mt-4"
              title="No members yet"
              description="Share the join code above to add your first team member."
            />
          ) : (
            <ul className="mt-4 space-y-3">
              {org.members.map((member) => (
                <li key={member.userId}>
                  <Card>
                    <CardContent className="flex items-center justify-between gap-4 py-4">
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted">{member.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(member.userId, member.name)}
                        disabled={removeMember.isPending}
                      >
                        <UserMinus className="size-4" aria-hidden="true" />
                        Remove
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="text-center">
        <Building2 className="mx-auto size-10 text-accent" aria-hidden="true" />
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">For schools & businesses</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">
          Buy a bulk membership for your team, or join one with a code from your employer or school.
        </p>
      </div>

      <div className="mt-6 flex justify-center">
        <Tabs
          label="Business account mode"
          value={mode}
          onChange={(id) => setMode(id as "start" | "join")}
          items={[
            { id: "start", label: "Start a business account" },
            { id: "join", label: "Join with a code" },
          ]}
        />
      </div>

      {mode === "start" ? (
        <>
          <div className="mt-8 flex flex-col items-center gap-4">
            <Field
              label="Organization name"
              error={purchaseForm.formState.errors.name?.message}
              className="w-full max-w-sm"
            >
              {(props) => (
                <Input {...props} placeholder="Chennai Public School" {...purchaseForm.register("name")} />
              )}
            </Field>
            <Field
              label="Number of seats"
              error={purchaseForm.formState.errors.seatCount?.message}
              className="w-full max-w-sm"
            >
              {(props) => (
                <Input {...props} type="number" min={1} {...purchaseForm.register("seatCount")} />
              )}
            </Field>

            <Tabs
              label="Billing cycle"
              value={billingCycle}
              onChange={(id) => setBillingCycle(id as BillingCycle)}
              items={[
                { id: "monthly", label: "Monthly" },
                { id: "annual", label: "Annual" },
              ]}
            />
          </div>

          {plansLoading ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {plans
                ?.filter((plan) => plan.id === "basic" || plan.id === "premium")
                .map((plan) => (
                  <Card key={plan.id} className={cn("flex flex-col", plan.popular && "border-accent shadow-lift")}>
                    <CardHeader>
                      <CardTitle className="font-display">{plan.name}</CardTitle>
                      {isAnnual ? (
                        <div>
                          <span className="font-display text-3xl font-semibold">
                            ₹{(plan.annualPrice / 12).toFixed(0)}
                          </span>
                          <span className="text-sm text-muted">/seat/month, billed yearly</span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-display text-3xl font-semibold">₹{plan.price}</span>
                          <span className="text-sm text-muted">/seat/month</span>
                        </div>
                      )}
                      <p className="text-sm text-muted">{formatMaxBooks(plan.maxBooks)}</p>
                    </CardHeader>
                    <CardContent>
                      <Button
                        className="w-full"
                        onClick={purchaseForm.handleSubmit(() => setCheckoutPlan(plan))}
                      >
                        Start with {plan.name}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </>
      ) : (
        <Card className="mx-auto mt-8 max-w-sm">
          <CardHeader>
            <CardTitle className="font-display">Join an organization</CardTitle>
            <p className="text-sm text-muted">Enter the code your employer or school shared with you.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={joinForm.handleSubmit(onJoin)} noValidate className="flex flex-col gap-4">
              <Field label="Organization code" error={joinForm.formState.errors.joinCode?.message}>
                {(props) => (
                  <Input {...props} placeholder="e.g. ORGCODE1" {...joinForm.register("joinCode")} />
                )}
              </Field>
              <Button type="submit" disabled={joinForm.formState.isSubmitting}>
                {joinForm.formState.isSubmitting ? "Joining…" : "Join organization"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {checkoutPlan && (
        <CheckoutDialog
          title={`Start with ${checkoutPlan.name}`}
          amount={
            (isAnnual ? checkoutPlan.annualPrice : checkoutPlan.price) *
            (purchaseForm.getValues().seatCount || 1)
          }
          onClose={() => setCheckoutPlan(null)}
          onSubmit={handleCheckoutSubmit}
        />
      )}
    </div>
  );
}
