import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CalendarClock, Library, Settings, History, GraduationCap, Award, MapPin } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  useMyLoansQuery,
  useReturnBook,
  useRenewLoan,
  daysUntilDue,
  type Loan,
} from "../../features/loans/queries";
import { DueDateBadge } from "../../features/loans/DueDateBadge";
import {
  useCurrentSubscriptionQuery,
  formatMaxBooks,
  usePauseSubscription,
  useResumeSubscription,
} from "../../features/subscriptions/queries";
import { useMyEnrollmentsQuery } from "../../features/learn/queries";
import { useMyCertificatesQuery } from "../../features/learn/tests-queries";
import { useMyBookingsQuery, useCancelBooking } from "../../features/learn/batches-queries";
import {
  useMyReservationsQuery,
  useCancelReservation,
  useClaimReservation,
} from "../../features/reservations/queries";
import { useMyOrdersQuery, usePayOrder } from "../../features/orders/queries";
import { BookCover } from "../../features/books/BookCover";
import { StatCard } from "../../components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button, buttonVariants } from "../../components/ui/button";
import { ProgressBar } from "../../components/ui/progress-bar";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { Tabs, TabPanel } from "../../components/ui/tabs";
import { useToast } from "../../components/ui/toast";
import { CheckoutDialog } from "../../components/payments/CheckoutDialog";
import type { PaymentInput } from "../../lib/payment";
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
  const { data: bookings } = useMyBookingsQuery(Boolean(user));
  const { data: reservations } = useMyReservationsQuery(Boolean(user));
  const { data: orders } = useMyOrdersQuery(Boolean(user));
  const returnBook = useReturnBook();
  const renewLoan = useRenewLoan();
  const cancelBooking = useCancelBooking();
  const cancelReservation = useCancelReservation();
  const claimReservation = useClaimReservation();
  const payOrder = usePayOrder();
  const pauseSubscription = usePauseSubscription();
  const resumeSubscription = useResumeSubscription();
  const [payingOrder, setPayingOrder] = useState<{ id: string; amount: number } | null>(null);

  if (!user) return null;

  const activeLoans = (loans ?? []).filter((l) => !l.returnedAt);
  const pastLoans = (loans ?? []).filter((l) => Boolean(l.returnedAt));
  const dueSoon = activeLoans.filter((l) => daysUntilDue(l) <= 2).length;
  const pendingOrders = (orders ?? []).filter((o) => o.status === "pending");
  const firstName = user.name.split(" ")[0];

  const handleReturn = (loan: Loan) => {
    returnBook.mutate(loan.id, {
      onSuccess: (returned) => {
        if (returned.lateFeeOrderId && returned.lateFeeAmount) {
          const orderId = returned.lateFeeOrderId;
          const amount = returned.lateFeeAmount;
          toast(
            "error",
            `Returned "${loan.bookTitle}" — this was overdue, so a ₹${amount.toFixed(2)} late fee was added.`,
            <Button size="sm" variant="secondary" onClick={() => setPayingOrder({ id: orderId, amount })}>
              Pay now
            </Button>,
          );
        } else {
          toast("success", `Returned "${loan.bookTitle}" — happy next read!`);
        }
      },
      onError: (err) =>
        toast("error", err instanceof ApiError ? err.message : "Couldn't return the book"),
    });
  };

  const handlePaySubmit = async (payment: PaymentInput) => {
    if (!payingOrder) return;
    await payOrder.mutateAsync({ orderId: payingOrder.id, payment });
    toast("success", "Late fee paid — thanks for settling up!");
    setPayingOrder(null);
  };

  const handlePauseSubscription = () => {
    pauseSubscription.mutate(undefined, {
      onSuccess: () => toast("success", "Your subscription is paused — it'll resume automatically in a month."),
      onError: (err) =>
        toast("error", err instanceof ApiError ? err.message : "Couldn't pause your subscription"),
    });
  };

  const handleResumeSubscription = () => {
    resumeSubscription.mutate(undefined, {
      onSuccess: () => toast("success", "Your subscription is active again — welcome back!"),
      onError: (err) =>
        toast("error", err instanceof ApiError ? err.message : "Couldn't resume your subscription"),
    });
  };

  const handleRenew = (loan: Loan) => {
    renewLoan.mutate(loan.id, {
      onSuccess: (renewed) =>
        toast("success", `Renewed "${loan.bookTitle}" — now due ${formatDate(renewed.dueDate)}.`),
      onError: (err) =>
        toast("error", err instanceof ApiError ? err.message : "Couldn't renew this loan"),
    });
  };

  const handleCancelBooking = (bookingId: string, courseTitle: string) => {
    cancelBooking.mutate(bookingId, {
      onSuccess: () => toast("success", `Cancelled your booking for "${courseTitle}"`),
      onError: (err) =>
        toast("error", err instanceof ApiError ? err.message : "Couldn't cancel the booking"),
    });
  };

  const activeBookings = (bookings ?? []).filter((b) => b.status !== "CANCELLED");
  const activeReservations = (reservations ?? []).filter(
    (r) => r.status === "WAITING" || r.status === "READY_FOR_PICKUP",
  );

  const handleCancelReservation = (reservationId: string, bookTitle: string) => {
    cancelReservation.mutate(reservationId, {
      onSuccess: () => toast("success", `Left the waitlist for "${bookTitle}"`),
      onError: (err) =>
        toast("error", err instanceof ApiError ? err.message : "Couldn't leave the waitlist"),
    });
  };

  const handleClaimReservation = (reservationId: string, bookTitle: string) => {
    claimReservation.mutate(reservationId, {
      onSuccess: () => toast("success", `Borrowed "${bookTitle}" from your hold`),
      onError: (err) =>
        toast("error", err instanceof ApiError ? err.message : "Couldn't claim this hold"),
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

      {pendingOrders.length > 0 && (
        <Card className="mt-6 border-danger/30 bg-danger/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium text-danger">
                {pendingOrders.length === 1
                  ? "You have an outstanding late fee"
                  : `You have ${pendingOrders.length} outstanding late fees`}
              </p>
              <p className="text-sm text-muted">
                Total due: ₹{pendingOrders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() =>
                setPayingOrder({ id: pendingOrders[0].id, amount: pendingOrders[0].totalAmount })
              }
            >
              Pay now
            </Button>
          </CardContent>
        </Card>
      )}

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
                      <div className="flex shrink-0 items-center gap-2">
                        {loan.renewed ? (
                          <Badge variant="outline">Renewed</Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={renewLoan.isPending}
                            onClick={() => handleRenew(loan)}
                          >
                            Renew
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={returnBook.isPending}
                          onClick={() => handleReturn(loan)}
                        >
                          Return
                        </Button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}

            {activeReservations.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
                  Your waitlist
                </h3>
                <ul className="mt-2 space-y-2">
                  {activeReservations.map((reservation) => (
                    <li key={reservation.id}>
                      <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
                        <Link
                          to={`/books/${reservation.bookId}`}
                          className="font-medium hover:text-accent"
                        >
                          {reservation.bookTitle}
                        </Link>
                        <div className="flex items-center gap-2">
                          {reservation.status === "WAITING" ? (
                            <>
                              <Badge variant="outline">Waiting</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={cancelReservation.isPending}
                                onClick={() =>
                                  handleCancelReservation(reservation.id, reservation.bookTitle)
                                }
                              >
                                Leave waitlist
                              </Button>
                            </>
                          ) : (
                            <>
                              <Badge variant="success">Ready for pickup</Badge>
                              <span className="text-xs text-muted">
                                {reservation.holdExpiresAt &&
                                  `Claim by ${formatDate(reservation.holdExpiresAt)}`}
                              </span>
                              <Button
                                size="sm"
                                disabled={claimReservation.isPending}
                                onClick={() =>
                                  handleClaimReservation(reservation.id, reservation.bookTitle)
                                }
                              >
                                Claim
                              </Button>
                            </>
                          )}
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              </div>
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

            {activeBookings.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
                  In-person batches
                </h3>
                <ul className="mt-2 space-y-2">
                  {activeBookings.map((booking) => (
                    <li key={booking.id}>
                      <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
                        <div className="flex items-start gap-3">
                          <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
                          <div>
                            <div className="font-medium">{booking.courseTitle}</div>
                            <div className="text-xs text-muted">
                              {booking.venueName} · {booking.startsOn} – {booking.endsOn}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-medium",
                              booking.status === "CONFIRMED"
                                ? "bg-success/15 text-success"
                                : "border border-border text-muted",
                            )}
                          >
                            {booking.status === "CONFIRMED" ? "Confirmed" : "Waitlisted"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={cancelBooking.isPending}
                            onClick={() => handleCancelBooking(booking.id, booking.courseTitle)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              </div>
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
                  <div className="flex items-center gap-2">
                    <div className="font-display text-2xl font-semibold capitalize">
                      {subscription.plan}
                    </div>
                    {subscription.status === "paused" && <Badge variant="warning">Paused</Badge>}
                  </div>
                  <p className="text-muted">
                    {subscription.billingCycle === "annual"
                      ? `₹${subscription.totalBilled}/year`
                      : `₹${subscription.monthlyPrice}/month`}{" "}
                    · {formatMaxBooks(subscription.maxConcurrentLoans).toLowerCase()}
                  </p>
                  {subscription.status === "paused" && subscription.pausedUntil ? (
                    <p className="text-muted">
                      Paused until {formatDate(subscription.pausedUntil)} — plan perks are on hold.
                    </p>
                  ) : (
                    <p className="text-muted">Active since {formatDate(subscription.startDate)}</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {subscription.status === "paused" ? (
                      <Button
                        size="sm"
                        disabled={resumeSubscription.isPending}
                        onClick={handleResumeSubscription}
                      >
                        Resume now
                      </Button>
                    ) : (
                      <>
                        <Link to="/plans" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
                          Change plan
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pauseSubscription.isPending}
                          onClick={handlePauseSubscription}
                        >
                          Pause a month
                        </Button>
                      </>
                    )}
                  </div>
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

      {payingOrder && (
        <CheckoutDialog
          title="Pay late fee"
          amount={payingOrder.amount}
          onClose={() => setPayingOrder(null)}
          onSubmit={handlePaySubmit}
        />
      )}
    </div>
  );
}
