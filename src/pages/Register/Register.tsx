import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { registerSchema, type RegisterFormValues } from "../../lib/schemas/auth";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Field } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";

export default function Register() {
  const { register: registerAccount } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [serverError, setServerError] = useState("");

  const returnTo = params.get("returnTo") || "/dashboard";
  const referralCodeFromLink = params.get("ref") ?? "";
  const giftCodeFromLink = params.get("gift") ?? "";
  const orgCodeFromLink = params.get("org") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      referralCode: referralCodeFromLink,
      giftCode: giftCodeFromLink,
      orgCode: orgCodeFromLink,
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError("");
    try {
      await registerAccount({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone ?? "",
        address: values.address ?? "",
        referralCode: values.referralCode ?? "",
        giftCode: values.giftCode ?? "",
        orgCode: values.orgCode ?? "",
      });
      navigate(returnTo, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <div className="mx-auto flex max-w-md items-center px-4 py-10 sm:px-6">
      <Card className="w-full">
        <CardHeader className="text-center">
          <h1 className="font-display text-2xl font-semibold">{t("auth.registerTitle")}</h1>
          <p className="text-sm text-muted">{t("auth.registerSubtitle")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            {serverError && (
              <p
                role="alert"
                className="flex items-center gap-2 rounded-(--radius-control) bg-danger/10 px-3 py-2 text-sm text-danger"
              >
                <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                {serverError}
              </p>
            )}

            <Field label={t("auth.fullName")} error={errors.name?.message}>
              {(props) => (
                <Input
                  {...props}
                  autoComplete="name"
                  placeholder="Priya Raman"
                  {...register("name")}
                />
              )}
            </Field>

            <Field label={t("auth.emailLabel")} error={errors.email?.message}>
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register("email")}
                />
              )}
            </Field>

            <Field
              label={t("auth.phone")}
              optional
              error={errors.phone?.message}
              hint={t("auth.phoneHint")}
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

            <Field label={t("auth.deliveryAddress")} optional error={errors.address?.message}>
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

            <Field
              label={t("auth.referralCode")}
              optional
              error={errors.referralCode?.message}
              hint={t("auth.referralHint")}
            >
              {(props) => (
                <Input
                  {...props}
                  autoComplete="off"
                  placeholder="e.g. ABC12345"
                  {...register("referralCode")}
                />
              )}
            </Field>

            <Field
              label={t("auth.giftCode")}
              optional
              error={errors.giftCode?.message}
              hint={t("auth.giftHint")}
            >
              {(props) => (
                <Input
                  {...props}
                  autoComplete="off"
                  placeholder="e.g. XYZ98765"
                  {...register("giftCode")}
                />
              )}
            </Field>

            <Field
              label="Organization code"
              optional
              error={errors.orgCode?.message}
              hint="Joining your school or employer's plan? Enter its code here."
            >
              {(props) => (
                <Input
                  {...props}
                  autoComplete="off"
                  placeholder="e.g. ORGCODE1"
                  {...register("orgCode")}
                />
              )}
            </Field>

            <Field label={t("auth.password")} error={errors.password?.message} hint={t("auth.passwordHint")}>
              {(props) => (
                <Input
                  {...props}
                  type="password"
                  autoComplete="new-password"
                  {...register("password")}
                />
              )}
            </Field>

            <Field label={t("auth.confirmPassword")} error={errors.confirmPassword?.message}>
              {(props) => (
                <Input
                  {...props}
                  type="password"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                />
              )}
            </Field>

            <Button type="submit" size="lg" disabled={isSubmitting} className="mt-1 w-full">
              {isSubmitting ? t("auth.creatingAccount") : t("auth.createAccount")}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            {t("auth.alreadyMember")}{" "}
            <Link
              to={`/login${params.get("returnTo") ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
              className="font-medium text-accent hover:text-accent-hover"
            >
              {t("auth.signInButton")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
