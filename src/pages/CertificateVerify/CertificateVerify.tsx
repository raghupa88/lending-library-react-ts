import { Link, useParams } from "react-router-dom";
import { Award, ShieldCheck, ShieldX } from "lucide-react";
import { useCertificateVerifyQuery } from "../../features/learn/tests-queries";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default function CertificateVerify() {
  const { serial } = useParams<{ serial: string }>();
  const { data: certificate, isLoading, isError } = useCertificateVerifyQuery(serial);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      {isLoading && <Skeleton className="h-64 w-full" />}

      {isError && (
        <EmptyState
          icon={<ShieldX aria-hidden="true" />}
          title="Certificate not found"
          description={`No certificate matches serial "${serial}". Double-check the code and try again.`}
        />
      )}

      {certificate && (
        <div className="rounded-(--radius-card) border-2 border-accent bg-surface p-8 text-center shadow-lift">
          <Award className="mx-auto size-12 text-accent" aria-hidden="true" />
          <p className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-success">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Valid certificate
          </p>
          <h1 className="mt-4 font-display text-2xl font-semibold">{certificate.learnerName}</h1>
          <p className="mt-2 text-muted">has successfully completed</p>
          <p className="mt-1 font-display text-xl font-semibold text-accent">{certificate.courseTitle}</p>
          <p className="mt-4 text-sm text-muted">Issued {formatDate(certificate.issuedAt)}</p>
          <p className="mt-1 font-mono text-xs text-muted">{certificate.serial}</p>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        <Link to="/learn" className="text-accent hover:text-accent-hover">
          Browse Suvadi Learn courses →
        </Link>
      </p>
    </div>
  );
}
