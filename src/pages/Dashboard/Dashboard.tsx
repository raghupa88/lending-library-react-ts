import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CalendarClock, Library, Settings, History, GraduationCap, Award } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  useMyLoansQuery,
  useReturnBook,
  daysUntilDue,
  type Loan,
} from "../../features/loans/queries";
import { DueDateBadge } from "../../features/loans/DueDateBadge";
import {
  useCurrentSubscriptionQuery,
  formatMaxBooks,
} from "../../features/subscriptions/queries";
import { useMyEnrollmentsQuery } from "../../features/learn/queries";
import { useMyCertificatesQuery } from "../../features/learn/tests-queries";
import { BookCover } from "../../features/books/BookCover";
import { StatCard } from "../../components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button, buttonVariants } from "../../components/ui/button";
import { ProgressBar } from "../../components/ui/progress-bar";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { Tabs, TabPanel } from "../../components/ui/tabs";
import { useToast } from "../../components/ui/toast";
import { ApiError } from "../../lib/api";
import { cn } from "../../lib/cn";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("reading");
  const { data: loans, isLoading } = useMyLoansQuery(Boolean(user));
  const { data: subscription } = useCurrentSubscriptionQuery(Boolean(user));
  const { data: enrollments } = useMyEnrollmentsQuery(Boolean(user));
  const { data: certificates } = useMyCertificatesQuery(Boolean(user));
  const returnBook = useReturnBook();

  if (!user) return null;

  const activeLoans = (loans ?? []).filter((l) => !l.returnedAt);
  const pastLoans = (loans ?? []).filter((l) => Boolean(l.returnedAt));
  const dueSoon = activeLoans.filter((l) => daysUntilDue(l) <= 2).length;
  const firstName = user.name.split(" ")[0];

  const handleReturn = (loan: Loan) => {
    returnBook.mutate(loan.id, {
      onSuccess: () => toast("success", `Returned "${loan.bookTitle}" — happy next read!`),
      onError: (err) =>
        toast("error", err instanceof ApiError ? err.message : "Couldn't return the book"),
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-muted">Here's what's on your shelf today.</p>
        </div>
        <Link to="/profile" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
          <Settings aria-hidden="true" />
          Edit profile
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Borrowed now"
          value={isLoading ? "–" : activeLoans.length}
          icon={<BookOpen aria-hidden="true" />}
        />
        <StatCard
          label="Due soon"
          value={isLoading ? "–" : dueSoon}
          icon={<CalendarClock aria-hidden="true" />}
          tone={dueSoon > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Books read"
          value={isLoading ? "–" : pastLoans.length}
          icon={<History aria-hidden="true" />}
        />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_300px]">
        <section>
          <Tabs
            label="Your books"
            value={tab}
            onChange={setTab}
            items={[
              { id: "reading", label: `Currently reading (${activeLoans.length})` },
              { id: "history", label: `History (${pastLoans.length})` },
              { id: "learning", label: `My learning (${enrollments?.length ?? 0})` },
            ]}
            className="w-fit"
          />

          <TabPanel id="reading" active={tab === "reading"} className="mt-5">
            {isLoading ? (
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
            ) : activeLoans.length === 0 ? (
              <EmptyState
                icon={<Library aria-hidden="true" />}
                title="Nothing borrowed right now"
                description="Browse the shelf and borrow your next read."
                action={
                  <Link to="/books" className={cn(buttonVariants({ size: "md" }))}>
                    Browse the shelf
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-3">
                {activeLoans.map((loan) => (
                  <li key={loan.id}>
                    <Card className="flex items-center gap-4 p-4">
                      <Link to={`/books/${loan.bookId}`} className="w-16 shrink-0">
                        <BookCover
                          title={loan.bookTitle}
                          author={loan.bookAuthor}
                          cover={loan.bookCover}
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/books/${loan.bookId}`}
                          className="font-medium hover:text-accent"
                        >
                          {loan.bookTitle}
                        </Link>
                        <div className="text-sm text-muted">{loan.bookAuthor}</div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                          <span>Borrowed {formatDate(loan.borrowedAt)}</span>
                          <DueDateBadge loan={loan} />
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={returnBook.isPending}
                        onClick={() => handleReturn(loan)}
                      >
                        Return
                      </Button>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </TabPanel>

          <TabPanel id="history" active={tab === "history"} className="mt-5">
            {pastLoans.length === 0 ? (
              <EmptyState
                icon={<History aria-hidden="true" />}
                title="No reading history yet"
                description="Books you return will show up here."
              />
            ) : (
              <ul className="divide-y divide-border rounded-(--radius-card) border border-border bg-surface">
                {pastLoans.map((loan) => (
                  <li key={loan.id} className="flex items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <Link to={`/books/${loan.bookId}`} className="font-medium hover:text-accent">
                        {loan.bookTitle}
                      </Link>
                      <div className="text-sm text-muted">{loan.bookAuthor}</div>
                    </div>
                    <div className="text-right text-xs text-muted">
                      <div>Borrowed {formatDate(loan.borrowedAt)}</div>
                      <div>Returned {loan.returnedAt ? formatDate(loan.returnedAt) : "—"}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabPanel>

          <TabPanel id="learning" active={tab === "learning"} className="mt-5">
            {!enrollments || enrollments.length === 0 ? (
              <EmptyState
                icon={<GraduationCap aria-hidden="true" />}
                title="No courses yet"
                description="Suvadi Learn has free courses on saving, investing, and the markets."
                action={
                  <Link to="/learn" className={cn(buttonVariants({ size: "md" }))}>
                    Browse courses
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-3">
                {enrollments.map((enrollment) => (
                  <li key={enrollment.id}>
                    <Card className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/learn/${enrollment.courseSlug}`}
                            className="font-medium hover:text-accent"
                          >
                            {enrollment.courseTitle}
                          </Link>
                          <div className="text-sm text-muted">
                            Enrolled {formatDate(enrollment.enrolledAt)}
                          </div>
                        </div>
                        <Link
                          to={`/learn/${enrollment.courseSlug}/lesson/${
                            enrollment.nextLessonId ?? ""
                          }`}
                          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "shrink-0")}
                        >
                          {enrollment.nextLessonId ? "Continue" : "Review"}
                        </Link>
                      </div>
                      <ProgressBar
                        className="mt-3"
                        label={`${enrollment.courseTitle} progress`}
                        value={enrollment.completedLessons}
                        max={enrollment.totalLessons}
                      />
                    </Card>
                  </li>
                ))}
              </ul>
            )}

            {certificates && certificates.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">Certificates</h3>
                <ul className="mt-2 space-y-2">
                  {certificates.map((cert) => (
                    <li key={cert.id}>
                      <Link
                        to={`/certificates/${cert.serial}`}
                        className="flex items-center gap-3 rounded-(--radius-card) border border-border bg-surface p-3 hover:border-accent"
                      >
                        <Award className="size-5 shrink-0 text-accent" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{cert.courseTitle}</div>
                          <div className="text-xs text-muted">{formatDate(cert.issuedAt)}</div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabPanel>
        </section>

        {/* Subscription card */}
        <aside>
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Your plan</CardTitle>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-2 text-sm">
                  <div className="font-display text-2xl font-semibold capitalize">
                    {subscription.plan}
                  </div>
                  <p className="text-muted">
                    ₹{subscription.monthlyPrice}/month ·{" "}
                    {formatMaxBooks(subscription.maxConcurrentLoans).toLowerCase()}
                  </p>
                  <p className="text-muted">Active since {formatDate(subscription.startDate)}</p>
                  <Link
                    to="/plans"
                    className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-2")}
                  >
                    Change plan
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <p className="text-muted">No active plan — pick one to start borrowing books.</p>
                  <Link to="/plans" className={cn(buttonVariants({ size: "sm" }))}>
                    Choose a plan
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
