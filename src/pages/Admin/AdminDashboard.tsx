import { Link } from "react-router-dom";
import { BookOpen, BookMarked, AlertTriangle, Users, TrendingUp } from "lucide-react";
import { useBooksQuery } from "../../features/books/queries";
import { useAdminLoansQuery, useAdminUsersQuery, useTrendingBooksQuery } from "../../features/admin/queries";
import { StatCard } from "../../components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { EmptyState } from "../../components/ui/empty-state";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function AdminDashboard() {
  const { data: books } = useBooksQuery({ size: 1 });
  const { data: loans } = useAdminLoansQuery();
  const { data: users } = useAdminUsersQuery();
  const { data: trending } = useTrendingBooksQuery();

  const activeLoans = (loans ?? []).filter((l) => l.status !== "RETURNED");
  const overdue = (loans ?? []).filter((l) => l.status === "OVERDUE");
  const recent = (loans ?? []).slice(0, 6);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">Library overview</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Titles in catalog"
          value={books?.totalElements ?? "–"}
          icon={<BookOpen aria-hidden="true" />}
        />
        <StatCard
          label="Copies out now"
          value={loans ? activeLoans.length : "–"}
          icon={<BookMarked aria-hidden="true" />}
        />
        <StatCard
          label="Overdue"
          value={loans ? overdue.length : "–"}
          icon={<AlertTriangle aria-hidden="true" />}
          tone={overdue.length > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Members"
          value={users?.length ?? "–"}
          icon={<Users aria-hidden="true" />}
        />
      </div>

      <Card className="mt-8">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-display">Recent loan activity</CardTitle>
          <Link to="/admin/loans" className="text-sm font-medium text-accent hover:text-accent-hover">
            All loans →
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">No loans yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((loan) => (
                <li key={loan.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                  <span className="font-medium">{loan.memberName}</span>
                  <span className="text-muted">borrowed</span>
                  <span className="font-medium">{loan.bookTitle}</span>
                  <span className="text-muted">on {formatDate(loan.borrowedAt)}</span>
                  <span className="ml-auto">
                    {loan.status === "OVERDUE" ? (
                      <Badge variant="danger">Overdue</Badge>
                    ) : loan.status === "RETURNED" ? (
                      <Badge variant="outline">Returned</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-display">Trending books</CardTitle>
        </CardHeader>
        <CardContent>
          {!trending || trending.length === 0 ? (
            <EmptyState
              icon={<TrendingUp aria-hidden="true" />}
              title="No trend data yet"
              description="Borrow counts build up over time — check back once members start borrowing."
            />
          ) : (
            <ul className="divide-y divide-border">
              {trending.map((book) => (
                <li key={book.bookId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium">{book.title}</span>
                    <span className="text-muted"> by {book.author}</span>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {book.borrowCount} borrows
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
