import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "../App";
import { ThemeProvider } from "../context/ThemeContext";
import { LocaleProvider } from "../context/LocaleContext";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../components/ui/toast";

function renderApp(route = "/") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LocaleProvider>
            <AuthProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </AuthProvider>
          </LocaleProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            success: true,
            data: {
              content: [],
              totalPages: 0,
              totalElements: 0,
              currentPage: 0,
              pageSize: 24,
              hasNext: false,
              hasPrev: false,
            },
          }),
        ),
    }),
  );
});

describe("App shell", () => {
  it("renders the navbar wordmark and skip link", async () => {
    renderApp();
    expect(await screen.findByRole("link", { name: /suvadi — home/i })).toBeInTheDocument();
    expect(screen.getByText(/skip to content/i)).toBeInTheDocument();
  });

  it("renders the home hero", async () => {
    renderApp();
    expect(
      await screen.findByRole("heading", { level: 1, name: /your neighbourhood library/i }),
    ).toBeInTheDocument();
  });

  it("shows the not-found page for unknown routes", async () => {
    renderApp("/definitely-not-a-page");
    expect(await screen.findByText(/page not found/i)).toBeInTheDocument();
  });
});
