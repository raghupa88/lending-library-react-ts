import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, Gift } from "lucide-react";
import { usePlansQuery, formatMaxBooks, type Plan, type BillingCycle } from "../../features/subscriptions/queries";
import { useMyGiftsQuery, usePurchaseGift, useRedeemGift } from "../../features/gifts/queries";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Field } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { Tabs } from "../../components/ui/tabs";
import { CheckoutDialog } from "../../components/payments/CheckoutDialog";
import { useToast } from "../../components/ui/toast";
import { ApiError } from "../../lib/api";
import type { PaymentInput } from "../../lib/payment";
import { cn } from "../../lib/cn";

const recipientSchema = z.object({
  recipientEmail: z.email("Enter a valid email address"),
});
type RecipientFormValues = z.infer<typeof recipientSchema>;

const redeemSchema = z.object({
  giftCode: z.string().trim().min(1, "Enter a gift code"),
});
type RedeemFormValues = z.infer<typeof redeemSchema>;

export default function GiftSubscription() {
  const { toast } = useToast();
  const [mode, setMode] = useState<"send" | "redeem">("send");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const [lastGiftCode, setLastGiftCode] = useState<string | null>(null);

  const { data: plans, isLoading: plansLoading } = usePlansQuery();
  const { data: gifts, isLoading: giftsLoading } = useMyGiftsQuery(mode === "send");
  const purchaseGift = usePurchaseGift();
  const redeemGift = useRedeemGift();

  const recipientForm = useForm<RecipientFormValues>({ resolver: zodResolver(recipientSchema) });
  const redeemForm = useForm<RedeemFormValues>({ resolver: zodResolver(redeemSchema) });

  const isAnnual = billingCycle === "annual";

  const handleCheckoutSubmit = async (payment: PaymentInput) => {
    if (!checkoutPlan) return;
    const { recipientEmail } = recipientForm.getValues();
    const gift = await purchaseGift.mutateAsync({
      recipientEmail,
      plan: checkoutPlan.id,
      billingCycle,
      payment,
    });
    setCheckoutPlan(null);
    setLastGiftCode(gift.giftCode);
    recipientForm.reset({ recipientEmail: "" });
    toast("success", `Gift sent! Charged ₹${gift.amountPaid.toFixed(2)}`);
  };

  const onRedeem = async (values: RedeemFormValues) => {
    try {
      const sub = await redeemGift.mutateAsync(values.giftCode);
      redeemForm.reset();
      toast("success", `Redeemed! You're now on the ${sub.plan} plan.`);
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Couldn't redeem that code");
    }
  };

  const giftLink = (code: string) => `${window.location.origin}/register?gift=${code}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="text-center">
        <Gift className="mx-auto size-10 text-accent" aria-hidden="true" />
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Gift a subscription</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">
          Buy a plan for someone else — they redeem the code whenever they're ready.
        </p>
      </div>

      <div className="mt-6 flex justify-center">
        <Tabs
          label="Gift mode"
          value={mode}
          onChange={(id) => setMode(id as "send" | "redeem")}
          items={[
            { id: "send", label: "Send a gift" },
            { id: "redeem", label: "Redeem a gift" },
          ]}
        />
      </div>

      {mode === "send" ? (
        <>
          <div className="mt-8 flex flex-col items-center gap-4">
            <Field
              label="Recipient's email"
              error={recipientForm.formState.errors.recipientEmail?.message}
              className="w-full max-w-sm"
            >
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  placeholder="friend@example.com"
                  {...recipientForm.register("recipientEmail")}
                />
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
                    <CardContent>
                      <Button
                        className="w-full"
                        onClick={recipientForm.handleSubmit(() => setCheckoutPlan(plan))}
                      >
                        Send {plan.name} as a gift
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          {lastGiftCode && (
            <Card className="mt-8">
              <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
                <p className="text-sm text-muted">Share this code or link with your friend:</p>
                <code className="rounded-(--radius-control) bg-surface-2 px-3 py-2 font-mono text-lg">
                  {lastGiftCode}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(giftLink(lastGiftCode));
                      toast("success", "Gift link copied");
                    } catch {
                      toast("error", "Couldn't copy the link");
                    }
                  }}
                >
                  <Copy className="size-4" aria-hidden="true" />
                  Copy gift link
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="mt-10">
            <h2 className="font-display text-xl font-semibold">Gifts you've sent</h2>
            {giftsLoading ? (
              <div className="mt-4 space-y-3">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !gifts || gifts.length === 0 ? (
              <EmptyState
                className="mt-4"
                title="No gifts sent yet"
                description="Send your first gift subscription above."
              />
            ) : (
              <ul className="mt-4 space-y-3">
                {gifts.map((gift) => (
                  <li key={gift.id}>
                    <Card>
                      <CardContent className="flex items-center justify-between gap-4 py-4">
                        <div>
                          <p className="font-medium">{gift.recipientEmail}</p>
                          <p className="text-sm text-muted">
                            {gift.plan} · {gift.billingCycle} · code {gift.giftCode}
                          </p>
                        </div>
                        <Badge variant={gift.status === "redeemed" ? "success" : "accent"}>
                          {gift.status === "redeemed" ? "Redeemed" : "Pending"}
                        </Badge>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <Card className="mx-auto mt-8 max-w-sm">
          <CardHeader>
            <CardTitle className="font-display">Redeem a gift code</CardTitle>
            <p className="text-sm text-muted">Enter the code someone shared with you.</p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={redeemForm.handleSubmit(onRedeem)}
              noValidate
              className="flex flex-col gap-4"
            >
              <Field label="Gift code" error={redeemForm.formState.errors.giftCode?.message}>
                {(props) => (
                  <Input {...props} placeholder="e.g. XYZ98765" {...redeemForm.register("giftCode")} />
                )}
              </Field>
              <Button type="submit" disabled={redeemForm.formState.isSubmitting}>
                {redeemForm.formState.isSubmitting ? "Redeeming…" : "Redeem gift"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {checkoutPlan && (
        <CheckoutDialog
          title={`Gift ${checkoutPlan.name}`}
          amount={isAnnual ? checkoutPlan.annualPrice : checkoutPlan.price}
          onClose={() => setCheckoutPlan(null)}
          onSubmit={handleCheckoutSubmit}
        />
      )}
    </div>
  );
}
