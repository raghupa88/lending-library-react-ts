import { Link } from "react-router-dom";
import { ArrowRight, BookOpenCheck, Truck, Sparkles, Library } from "lucide-react";
import { useBooksQuery } from "../../features/books/queries";
import { usePlansQuery, formatMaxBooks } from "../../features/subscriptions/queries";
import { BookCover } from "../../features/books/BookCover";
import { Button, buttonVariants } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/cn";

const steps = [
  {
    icon: Sparkles,
    title: "Pick a plan",
    body: "Choose a monthly plan that matches your reading pace — from casual to voracious.",
  },
  {
    icon: BookOpenCheck,
    title: "Borrow your books",
    body: "Browse the shelf, borrow with one tap, and keep track of due dates on your dashboard.",
  },
  {
    icon: Truck,
    title: "Delivered to your door",
    body: "Premium plans include free home delivery and pickup anywhere in Tamil Nadu.",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { data, isLoading } = useBooksQuery({ size: 6 });
  const { data: plans } = usePlansQuery();
  const featured = data?.content ?? [];

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-14 pb-10 sm:px-6 md:grid-cols-2 md:pt-20">
        <div>
          <Badge variant="outline" className="mb-4">
            <Library className="size-3.5" aria-hidden="true" />
            Subscription lending library
          </Badge>
          <h1 className="font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
            Your neighbourhood library,{" "}
            <span className="text-accent">delivered.</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted">
            Borrow from a growing shelf of Tamil and English books on one simple
            monthly plan — returns, renewals and doorstep delivery included.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => navigate("/books")}>
              Browse the shelf
              <ArrowRight aria-hidden="true" />
            </Button>
            <Link
              to="/plans"
              className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
            >
              View plans
            </Link>
          </div>
        </div>

        {/* Cover collage */}
        <div aria-hidden="true" className="hidden justify-center md:flex">
          <div className="grid w-full max-w-sm grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => {
              const book = featured[i];
              return (
                <div
                  key={i}
                  className={cn(
                    "transition-transform",
                    i % 3 === 0 && "translate-y-3 -rotate-2",
                    i % 3 === 2 && "-translate-y-2 rotate-2",
                  )}
                >
                  {book ? (
                    <BookCover title={book.title} author={book.author} cover={book.cover} />
                  ) : (
                    <Skeleton className="aspect-[2/3] w-full" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* New on the shelf */}
      <section aria-labelledby="new-on-shelf" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-5 flex items-end justify-between">
          <h2 id="new-on-shelf" className="text-2xl font-semibold">
            New on the shelf
          </h2>
          <Link to="/books" className="text-sm font-medium text-accent hover:text-accent-hover">
            See all books →
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="aspect-[2/3] w-full" />
                  <Skeleton className="mt-2 h-4 w-3/4" />
                </li>
              ))
            : featured.map((book) => (
                <li key={book.id}>
                  <Link
                    to={`/books/${book.id}`}
                    className="group block rounded-md focus-visible:outline-2"
                  >
                    <BookCover
                      title={book.title}
                      author={book.author}
                      cover={book.cover}
                      className="transition-transform group-hover:-translate-y-1"
                    />
                    <div className="mt-2 text-sm leading-tight font-medium">{book.title}</div>
                    <div className="text-xs text-muted">{book.author}</div>
                  </Link>
                </li>
              ))}
        </ul>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-it-works" className="bg-surface-2 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="how-it-works" className="text-2xl font-semibold">
            How it works
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, body }) => (
              <Card key={title}>
                <CardHeader>
                  <div
                    aria-hidden="true"
                    className="mb-1 flex size-10 items-center justify-center rounded-full bg-accent/10 text-accent"
                  >
                    <Icon className="size-5" />
                  </div>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Plans teaser */}
      <section aria-labelledby="plans-heading" id="plans" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 id="plans-heading" className="text-2xl font-semibold">
          Plans for every kind of reader
        </h2>
        <p className="mt-1 text-muted">Simple monthly pricing. Pause or switch anytime.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(plans ?? []).map((plan) => (
            <Link key={plan.id} to="/plans" className="group">
              <Card
                className={cn(
                  "relative h-full transition-shadow group-hover:shadow-lift",
                  plan.popular && "border-accent shadow-lift",
                )}
              >
                {plan.popular && (
                  <Badge variant="accent" className="absolute -top-2.5 left-4">
                    Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="font-display">{plan.name}</CardTitle>
                  <div>
                    <span className="font-display text-3xl font-semibold">₹{plan.price}</span>
                    <span className="text-sm text-muted">/month</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted">{formatMaxBooks(plan.maxBooks)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
        <div className="rounded-(--radius-card) bg-secondary px-6 py-10 text-center text-secondary-foreground">
          <h2 className="font-display text-3xl font-semibold">Start your reading habit today</h2>
          <p className="mx-auto mt-2 max-w-md opacity-90">
            Join thousands of readers across Tamil Nadu. Your first shelf is waiting.
          </p>
          <Button
            size="lg"
            className="mt-6 bg-accent text-accent-foreground hover:bg-accent-hover"
            onClick={() => navigate("/register")}
          >
            Become a member
          </Button>
        </div>
      </section>
    </div>
  );
}
