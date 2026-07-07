interface Bar {
  label: string;
  value: number;
}

/**
 * A single-hue (nominal) or ordinal-ramp horizontal bar chart. Values are
 * direct-labeled at the tip of every bar — with only a handful of bars this
 * keeps every number reachable as plain text, no hover required. See
 * docs/adr for the palette validation behind `colors`.
 */
export function HorizontalBarChart({
  bars,
  colors,
  valueFormatter = (v) => v.toLocaleString("en-IN"),
  caption,
}: {
  bars: Bar[];
  colors: string[];
  valueFormatter?: (value: number) => string;
  caption: string;
}) {
  const max = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div role="img" aria-label={caption} className="flex flex-col gap-3">
      {bars.map((bar, i) => {
        const widthPercent = Math.max((bar.value / max) * 100, bar.value > 0 ? 2 : 0);
        const color = colors[i % colors.length];
        return (
          <div key={bar.label} className="flex items-center gap-3">
            <span className="w-36 shrink-0 truncate text-sm text-muted" title={bar.label}>
              {bar.label}
            </span>
            <div className="relative h-6 flex-1 rounded-sm bg-surface-2">
              <div
                className="h-6 rounded-r-md transition-[width]"
                style={{ width: `${widthPercent}%`, backgroundColor: color }}
              />
            </div>
            <span className="w-20 shrink-0 text-right text-sm font-medium tabular-nums">
              {valueFormatter(bar.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
