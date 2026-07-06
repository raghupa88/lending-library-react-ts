import type { CourseLevel, CourseTrack } from "./queries";

export const TRACK_LABELS: Record<CourseTrack, string> = {
  MONEY_FOUNDATIONS: "Money Foundations",
  EQUITIES: "Equities",
  BONDS_FIXED_INCOME: "Bonds & Fixed Income",
  DERIVATIVES: "Derivatives",
  PORTFOLIO_RISK: "Portfolio & Risk",
};

export const LEVEL_LABELS: Record<CourseLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};
