import { NavLink, Outlet, Link } from "react-router-dom";
import { LayoutDashboard, BookOpen, Users, BookMarked, GraduationCap, MapPin, ArrowLeft } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../ui/avatar";
import { cn } from "../../lib/cn";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/books", label: "Books", icon: BookOpen, end: false },
  { to: "/admin/learn/courses", label: "Courses", icon: GraduationCap, end: false },
  { to: "/admin/learn/venues", label: "Venues", icon: MapPin, end: false },
  { to: "/admin/members", label: "Members", icon: Users, end: false },
  { to: "/admin/loans", label: "Loans", icon: BookMarked, end: false },
];

export function AdminShell() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-dvh">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-(--radius-control) focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-foreground"
      >
        Skip to content
      </a>

      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <BookOpen className="size-5 text-accent" aria-hidden="true" />
          <span className="font-display font-semibold">Suvadi Admin</span>
        </div>
        <nav aria-label="Admin" className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-(--radius-control) px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent/10 text-accent-hover"
                    : "text-muted hover:bg-surface-2 hover:text-foreground",
                )
              }
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
          <div className="mt-auto border-t border-border pt-3">
            <Link
              to="/"
              className="flex items-center gap-2.5 rounded-(--radius-control) px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to site
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
          {/* Mobile: back link since the sidebar is hidden */}
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground md:hidden">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to site
          </Link>
          <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto md:hidden">
            {navItems.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "rounded-(--radius-control) px-2.5 py-1.5 text-sm font-medium whitespace-nowrap",
                    isActive ? "bg-accent/10 text-accent-hover" : "text-muted",
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user && (
              <>
                <span className="hidden text-sm text-muted sm:inline">{user.name}</span>
                <Avatar name={user.name} className="size-8" />
              </>
            )}
          </div>
        </header>
        <main id="admin-main" className="flex-1 bg-background p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
