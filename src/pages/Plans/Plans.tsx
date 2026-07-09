import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  usePlansQuery,
  useCurrentSubscriptionQuery,
  useSubscribe,
  formatMaxBooks,
  type Plan,
  type BillingCycle,
} from "../../features/subscriptions/queries";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { Tabs } from "../../components/ui/tabs";
import { useToast } from "../../components/ui/toast";
import { ApiError } from "../../lib/api";
import { cn } from "../../lib/cn";

export default function Plans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [confirming, setConfirming] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  const { data: plans, isLoading, isError } = usePlansQuery();
  const { data: subscription } = useCurrentSubscriptionQuery(Boolean(user));
  const subscribe = useSubscribe();

  const currentPlanId = subscription?.plan?.toLowerCase();
  const isAnnual = billingCycle === "annual";

  const choosePlan = (plan: Plan) => {
    if (!user) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setConfirming(plan);
  };

  const confirmSubscribe = () => {
    if (!confirming) return;
    subscribe.mutate(
      { planId: confirming.id, billingCycle },
      {
        onSuccess: (sub) => {
          setConfirming(null);
          toast("success", `You're on the ${sub.plan} plan — happy reading!`);
        },
        onError: (err) => {
          setConfirming(null);
          toast("error", err instanceof ApiError ? err.message : "Couldn't change the plan");
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">
          Plans for every kind of reader
        </h1>
        <p className="mx-auto mt-2 max-w-md text-muted">
          Simple pricing. Switch anytime — your borrowed books stay with you.
        </p>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Tabs
          label="Billing cycle"
          value={billingCycle}
          onChange={(id) => setBillingCycle(id as BillingCycle)}
          items={[
            { id: "monthly", label: "Monthly" },
            { id: "annual", label: "Annual" },
          ]}
        />
        {isAnnual && (
          <p className="text-sm font-medium text-success">Pay for 10 months, get 12 — 2 months free</p>
        )}
      </div>

      {isLoading ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      ) : isError || !plans ? (
        <EmptyState
          className="mt-10"
          title="Couldn't load plans"
          description="Something went wrong talking to the library. Try again in a moment."
        />
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = plan.id.toLowerCase() === currentPlanId;
            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative flex flex-col",
                  plan.popular && "border-accent shadow-lift",
                  isCurrent && "border-secondary",
                )}
              >
                {plan.popular && !isCurrent && (
                  <Badge variant="accent" className="absolute -top-2.5 left-4">
                    Popular
                  </Badge>
                )}
                {isCurrent && (
                  <Badge
                    className="absolute -top-2.5 left-4 bg-secondary text-secondary-foreground"
                  >
                    Your plan
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="font-display">{plan.name}</CardTitle>
                  {isAnnual ? (
                    <div>
                      <span className="font-display text-3xl font-semibold">
                        ₹{(plan.annualPrice / 12).toFixed(0)}
                      </span>
                      <span className="text-sm text-muted">/month, billed ₹{plan.annualPrice}/year</span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-display text-3xl font-semibold">₹{plan.price}</span>
                      <span className="text-sm text-muted">/month</span>
                    </div>
                  )}
                  <p className="text-sm text-muted">{formatMaxBooks(plan.maxBooks)}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-success"
                          aria-hidden="true"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.popular ? "primary" : "secondary"}
                    className="mt-5 w-full"
                    disabled={isCurrent}
                    onClick={() => choosePlan(plan)}
                  >
                    {isCurrent ? "Current plan" : subscription ? "Switch plan" : "Subscribe"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        title={`Switch to ${confirming?.name ?? ""}?`}
      >
        <p className="text-sm text-muted">
          {isAnnual
            ? `You'll be billed ₹${confirming?.annualPrice}/year (2 months free)`
            : `You'll be billed ₹${confirming?.price}/month`}{" "}
          — {confirming ? formatMaxBooks(confirming.maxBooks).toLowerCase() : ""}. You can switch
          again anytime.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(null)}>
            Cancel
          </Button>
          <Button onClick={confirmSubscribe} disabled={subscribe.isPending}>
            {subscribe.isPending ? "Confirming…" : "Confirm"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
