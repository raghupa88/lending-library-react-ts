import { useAdminUsersQuery } from "../../features/admin/queries";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MembersAdmin() {
  const { data: users, isLoading } = useAdminUsersQuery();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">Members</h1>
      <p className="mt-1 text-sm text-muted">
        {users ? `${users.length} registered member${users.length === 1 ? "" : "s"}` : "Loading…"}
      </p>

      {isLoading ? (
        <Skeleton className="mt-6 h-64 w-full" />
      ) : !users || users.length === 0 ? (
        <EmptyState className="mt-6" title="No members yet" />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-(--radius-card) border border-border bg-surface">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted uppercase">
                <th scope="col" className="px-4 py-3 font-medium">Name</th>
                <th scope="col" className="px-4 py-3 font-medium">Email</th>
                <th scope="col" className="px-4 py-3 font-medium">Role</th>
                <th scope="col" className="px-4 py-3 font-medium">Plan</th>
                <th scope="col" className="px-4 py-3 font-medium">Active loans</th>
                <th scope="col" className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-muted">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.role === "admin" ? (
                      <Badge variant="accent">Admin</Badge>
                    ) : (
                      <Badge variant="outline">Member</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">{user.plan ?? "—"}</td>
                  <td className="px-4 py-3">{user.activeLoans}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(user.joinedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
