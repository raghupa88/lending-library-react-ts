interface DailyBar {
  date: string;
  count: number;
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** A single-series column chart — one accent hue, values direct-labeled on the cap. */
export function DailyBarChart({ data, color, caption }: { data: DailyBar[]; color: string; caption: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div role="img" aria-label={caption} className="flex h-48 items-end gap-2 overflow-x-auto pb-1">
      {data.map((d) => {
        const heightPercent = Math.max((d.count / max) * 100, d.count > 0 ? 4 : 0);
        return (
          <div key={d.date} className="flex h-full min-w-10 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-xs font-medium tabular-nums">{d.count}</span>
            <div
              className="w-full max-w-6 rounded-t-md"
              style={{ height: `${heightPercent}%`, backgroundColor: color }}
            />
            <span className="text-xs whitespace-nowrap text-muted">{formatDay(d.date)}</span>
          </div>
        );
      })}
    </div>
  );
}
