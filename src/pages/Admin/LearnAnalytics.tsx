import { Users, IndianRupee, Award, CalendarCheck, Download } from "lucide-react";
import { useAdminAnalyticsQuery } from "../../features/learn/admin-analytics-queries";
import { useChartColors } from "../../lib/chartColors";
import { HorizontalBarChart } from "../../components/charts/HorizontalBarChart";
import { DailyBarChart } from "../../components/charts/DailyBarChart";
import { StatCard } from "../../components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ProgressBar } from "../../components/ui/progress-bar";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";

function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export default function LearnAnalytics() {
  const { data, isLoading } = useAdminAnalyticsQuery();
  const { accent, funnelRamp } = useChartColors();

  const handleExport = () => {
    if (!data) return;
    const sections = [
      ["Metric", "Value"],
      ["Total enrollments", data.totalEnrollments],
      ["Total revenue", data.totalRevenue],
      ["Attendance rate (%)", data.attendanceRatePercent.toFixed(1)],
      [],
      ["Completion funnel stage", "Count"],
      ["Enrolled", data.completionFunnel.enrolled],
      ["Started a lesson", data.completionFunnel.startedLesson],
      ["Completed all lessons", data.completionFunnel.completedAllLessons],
      ["Earned a certificate", data.completionFunnel.certified],
      [],
      ["Enrollments by day", ""],
      ["Date", "Count"],
      ...data.enrollmentsByDay.map((d) => [d.date, d.count]),
      [],
      ["Revenue by course", ""],
      ["Course", "Revenue"],
      ...data.revenueByCourse.map((r) => [r.courseTitle, r.revenue]),
    ];
    const blob = new Blob([toCsv(sections)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "suvadi-learn-analytics.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Learn analytics</h1>
          <p className="mt-1 text-sm text-muted">Enrollments, completion, revenue and attendance.</p>
        </div>
        <Button variant="secondary" disabled={!data} onClick={handleExport}>
          <Download aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="mt-6 h-96 w-full" />
      ) : !data ? (
        <EmptyState className="mt-6" title="Couldn't load analytics" />
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total enrollments"
              value={data.totalEnrollments}
              icon={<Users aria-hidden="true" />}
            />
            <StatCard
              label="Total revenue"
              value={formatRupees(data.totalRevenue)}
              icon={<IndianRupee aria-hidden="true" />}
            />
            <StatCard
              label="Certificates earned"
              value={data.completionFunnel.certified}
              icon={<Award aria-hidden="true" />}
            />
            <StatCard
              label="Attendance rate"
              value={`${data.attendanceRatePercent.toFixed(0)}%`}
              icon={<CalendarCheck aria-hidden="true" />}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Enrollments over time</CardTitle>
              </CardHeader>
              <CardContent>
                {data.enrollmentsByDay.length === 0 ? (
                  <p className="text-sm text-muted">No enrollments yet.</p>
                ) : (
                  <DailyBarChart
                    data={data.enrollmentsByDay}
                    color={accent}
                    caption={`Enrollments per day, ${data.enrollmentsByDay.length} day${data.enrollmentsByDay.length === 1 ? "" : "s"} of activity`}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display">Completion funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart
                  caption="Completion funnel from enrolled to certified"
                  colors={funnelRamp}
                  bars={[
                    { label: "Enrolled", value: data.completionFunnel.enrolled },
                    { label: "Started a lesson", value: data.completionFunnel.startedLesson },
                    { label: "Completed all lessons", value: data.completionFunnel.completedAllLessons },
                    { label: "Earned a certificate", value: data.completionFunnel.certified },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display">Revenue by course</CardTitle>
              </CardHeader>
              <CardContent>
                {data.revenueByCourse.length === 0 ? (
                  <p className="text-sm text-muted">No paid enrollments or bookings yet.</p>
                ) : (
                  <HorizontalBarChart
                    caption="Revenue by course"
                    colors={[accent]}
                    bars={data.revenueByCourse.map((r) => ({ label: r.courseTitle, value: r.revenue }))}
                    valueFormatter={formatRupees}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display">Batch attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressBar
                  label="Attendance rate across all marked sessions"
                  value={Math.round(data.attendanceRatePercent)}
                  max={100}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
