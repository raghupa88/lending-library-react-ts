import { useState } from "react";
import { useAdminLoansQuery } from "../../features/admin/queries";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { cn } from "../../lib/cn";

const FILTERS = [
  { id: "", label: "All" },
  { id: "active", label: "Active" },
  { id: "overdue", label: "Overdue" },
  { id: "returned", label: "Returned" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LoansAdmin() {
  const [status, setStatus] = useState("");
  const { data: loans, isLoading } = useAdminLoansQuery(status || undefined);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">Loans</h1>

      <div role="group" aria-label="Filter loans by status" className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            aria-pressed={status === filter.id}
            onClick={() => setStatus(filter.id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              status === filter.id
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-surface text-muted hover:text-foreground",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="mt-6 h-64 w-full" />
      ) : !loans || loans.length === 0 ? (
        <EmptyState className="mt-6" title="No loans match this filter" />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-(--radius-card) border border-border bg-surface">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted uppercase">
                <th scope="col" className="px-4 py-3 font-medium">Member</th>
                <th scope="col" className="px-4 py-3 font-medium">Book</th>
                <th scope="col" className="px-4 py-3 font-medium">Borrowed</th>
                <th scope="col" className="px-4 py-3 font-medium">Due</th>
                <th scope="col" className="px-4 py-3 font-medium">Returned</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loans.map((loan) => (
                <tr key={loan.id} className={cn(loan.status === "OVERDUE" && "bg-danger/5")}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{loan.memberName}</div>
                    <div className="text-xs text-muted">{loan.memberEmail}</div>
                  </td>
                  <td className="px-4 py-3">{loan.bookTitle}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(loan.borrowedAt)}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(loan.dueDate)}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(loan.returnedAt)}</td>
                  <td className="px-4 py-3">
                    {loan.status === "OVERDUE" ? (
                      <Badge variant="danger">Overdue</Badge>
                    ) : loan.status === "RETURNED" ? (
                      <Badge variant="outline">Returned</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
