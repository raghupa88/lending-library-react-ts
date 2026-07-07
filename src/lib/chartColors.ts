import { useTheme } from "../context/ThemeContext";

/**
 * A single accent hue for nominal bars/lines (one series → one color, per the
 * dataviz skill's color formula) plus a 4-step ordinal ramp for the
 * completion funnel (position-in-sequence, monotone light→dark). Both
 * validated with scripts/validate_palette.js against each theme's surface —
 * see docs/adr for the exact command and results.
 */
const ACCENT = { light: "#b4552d", dark: "#e07a4c" };

const FUNNEL_RAMP = {
  light: ["#d99a6f", "#c47a4a", "#b4552d", "#8f3e1f"],
  dark: ["#a85a38", "#c66840", "#e07a4c", "#f0a071"],
};

export function useChartColors() {
  const { theme } = useTheme();
  return {
    accent: ACCENT[theme],
    funnelRamp: FUNNEL_RAMP[theme],
  };
}
