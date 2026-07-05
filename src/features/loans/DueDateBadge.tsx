import { Badge } from "../../components/ui/badge";
import { daysUntilDue, type Loan } from "./queries";

export function DueDateBadge({ loan }: { loan: Loan }) {
  const days = daysUntilDue(loan);

  if (days < 0) {
    return <Badge variant="danger">Overdue by {-days} day{days === -1 ? "" : "s"}</Badge>;
  }
  if (days === 0) {
    return <Badge variant="warning">Due today</Badge>;
  }
  if (days <= 2) {
    return <Badge variant="warning">Due in {days} day{days === 1 ? "" : "s"}</Badge>;
  }
  return <Badge variant="success">Due in {days} days</Badge>;
}
