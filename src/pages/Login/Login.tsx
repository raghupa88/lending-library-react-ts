import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { loginSchema, type LoginFormValues } from "../../lib/schemas/auth";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Field } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

export default function Login() {
  const { login } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [serverError, setServerError] = useState("");

  const returnTo = params.get("returnTo") || "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError("");
    try {
      await login(values);
      navigate(returnTo, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10 sm:px-6">
      <Card className="w-full">
        <CardHeader className="text-center">
          <h1 className="font-display text-2xl font-semibold">{t("auth.loginTitle")}</h1>
          <p className="text-sm text-muted">{t("auth.loginSubtitle")}</p>
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

            <Field label={t("auth.passwordLabel")} error={errors.password?.message}>
              {(props) => (
                <Input
                  {...props}
                  type="password"
                  autoComplete="current-password"
                  placeholder={t("auth.passwordLabel")}
                  {...register("password")}
                />
              )}
            </Field>

            <Button type="submit" size="lg" disabled={isSubmitting} className="mt-1 w-full">
              {isSubmitting ? t("auth.signingIn") : t("auth.signInButton")}
            </Button>

            <div className="rounded-(--radius-control) bg-surface-2 px-3 py-2 text-xs text-muted">
              <p className="font-semibold">{t("auth.demoCredentials")}</p>
              <p>{t("auth.demoMember")}</p>
              <p>{t("auth.demoAdmin")}</p>
            </div>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            {t("auth.noAccount")}{" "}
            <Link
              to={`/register${params.get("returnTo") ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
              className="font-medium text-accent hover:text-accent-hover"
            >
              {t("auth.joinNow")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
