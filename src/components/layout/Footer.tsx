import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface-2">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-accent" aria-hidden="true" />
            <span className="font-display text-lg font-semibold">Suvadi</span>
          </div>
          <p className="mt-2 max-w-xs text-sm text-muted">
            A subscription lending library for the reading community in Tamil Nadu —
            borrow great books, delivered to your door.
          </p>
        </div>
        <nav aria-label="Footer" className="text-sm">
          <h2 className="mb-2 font-semibold">Explore</h2>
          <ul className="space-y-1.5">
            <li>
              <Link to="/books" className="text-muted hover:text-foreground">
                Browse books
              </Link>
            </li>
            <li>
              <Link to="/register" className="text-muted hover:text-foreground">
                Become a member
              </Link>
            </li>
            <li>
              <Link to="/gift" className="text-muted hover:text-foreground">
                Gift a subscription
              </Link>
            </li>
            <li>
              <Link to="/login" className="text-muted hover:text-foreground">
                Sign in
              </Link>
            </li>
          </ul>
        </nav>
        <div className="text-sm">
          <h2 className="mb-2 font-semibold">Contact</h2>
          <p className="text-muted">support@suvadilibrary.com</p>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} Suvadi Library. Built with care for readers.
      </div>
    </footer>
  );
}
