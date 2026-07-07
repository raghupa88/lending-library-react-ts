import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard } from "lucide-react";
import { paymentSchema, type PaymentFormValues } from "../../lib/schemas/payment";
import type { PaymentInput } from "../../lib/payment";
import { Dialog } from "../ui/dialog";
import { Field } from "../ui/field";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

export function CheckoutDialog({
  title,
  amount,
  onClose,
  onSubmit,
}: {
  title: string;
  amount: number;
  onClose: () => void;
  onSubmit: (input: PaymentInput) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
  });

  const submit = async (values: PaymentFormValues) => {
    try {
      await onSubmit(values);
    } catch (err) {
      setError("root", { message: err instanceof Error ? err.message : "Payment failed" });
    }
  };

  return (
    <Dialog open onClose={onClose} title={title} className="max-w-md">
      <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-(--radius-card) border border-border bg-surface-2 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            <CreditCard className="size-4 text-muted" aria-hidden="true" />
            Amount due
          </span>
          <span className="font-display text-lg font-semibold">₹{amount.toFixed(2)}</span>
        </div>

        <Field label="Cardholder name" error={errors.cardholderName?.message}>
          {(props) => <Input {...props} autoComplete="cc-name" {...register("cardholderName")} />}
        </Field>
        <Field label="Card number" error={errors.cardNumber?.message}>
          {(props) => (
            <Input
              {...props}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="4242 4242 4242 4242"
              {...register("cardNumber")}
            />
          )}
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Month" error={errors.expiryMonth?.message}>
            {(props) => (
              <Input {...props} inputMode="numeric" placeholder="MM" autoComplete="cc-exp-month" {...register("expiryMonth")} />
            )}
          </Field>
          <Field label="Year" error={errors.expiryYear?.message}>
            {(props) => (
              <Input {...props} inputMode="numeric" placeholder="YYYY" autoComplete="cc-exp-year" {...register("expiryYear")} />
            )}
          </Field>
          <Field label="CVC" error={errors.cvc?.message}>
            {(props) => <Input {...props} inputMode="numeric" autoComplete="cc-csc" {...register("cvc")} />}
          </Field>
        </div>

        <p className="text-xs text-muted">
          This is a demo checkout — no real payment is processed. Use{" "}
          <span className="font-mono">4242 4242 4242 4242</span> for a successful charge, or{" "}
          <span className="font-mono">4000 0000 0000 0002</span> to see a declined payment.
        </p>

        {errors.root?.message && (
          <p role="alert" className="text-sm text-danger">
            {errors.root.message}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Processing…" : `Pay ₹${amount.toFixed(2)}`}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
