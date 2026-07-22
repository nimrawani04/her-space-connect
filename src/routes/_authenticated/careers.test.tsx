import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---- Fixtures ------------------------------------------------------------

type Opp = {
  id: string;
  type: string;
  title: string;
  org: string;
  region: string;
  url: string | null;
  created_at: string;
};

const OPPS: Opp[] = Array.from({ length: 18 }).map((_, i) => ({
  id: `opp-${i}`,
  type: i % 2 === 0 ? "Scholarship" : "Grant",
  title: i === 0 ? "Rhodes Scholarship" : `Opportunity ${i}`,
  org: i === 0 ? "Rhodes Trust" : `Org ${i}`,
  region: i % 3 === 0 ? "Global" : "Europe",
  url: "https://example.com",
  created_at: new Date(2026, 0, 18 - i).toISOString(),
}));

// ---- Query builder mock --------------------------------------------------

type Filters = {
  cols: string;
  eq: Record<string, string>;
  or?: string;
  from?: number;
  to?: number;
  limit?: number;
};

function runQuery(f: Filters) {
  let rows = [...OPPS];
  for (const [k, v] of Object.entries(f.eq)) {
    rows = rows.filter((r) => (r as any)[k] === v);
  }
  if (f.or) {
    // Format: "title.ilike.%s%,org.ilike.%s%"
    const term = f.or.match(/ilike\.%(.*?)%/i)?.[1]?.toLowerCase() ?? "";
    rows = rows.filter(
      (r) => r.title.toLowerCase().includes(term) || r.org.toLowerCase().includes(term),
    );
  }
  // For facets query we ignore ordering/paging.
  if (f.cols.includes("id")) {
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (f.from != null && f.to != null) rows = rows.slice(f.from, f.to + 1);
  }
  if (f.limit) rows = rows.slice(0, f.limit);
  return rows;
}

function makeBuilder() {
  const state: Filters = { cols: "", eq: {} };
  const builder: any = {
    select(cols: string) {
      state.cols = cols;
      return builder;
    },
    order() { return builder; },
    range(from: number, to: number) {
      state.from = from;
      state.to = to;
      return builder;
    },
    eq(col: string, val: string) {
      state.eq[col] = val;
      return builder;
    },
    or(expr: string) {
      state.or = expr;
      return builder;
    },
    limit(n: number) {
      state.limit = n;
      return builder;
    },
    then(resolve: (v: { data: Opp[]; error: null }) => void) {
      // Small delay so React Query stays in a fetching state long enough
      // for the skeleton UI to be observable during refetch.
      setTimeout(() => resolve({ data: runQuery(state), error: null }), 30);
    },
  };
  return builder;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => makeBuilder(),
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// TanStack route registration is a side effect that doesn't affect rendering.
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<any>("@tanstack/react-router");
  return { ...actual, createFileRoute: () => (_opts: unknown) => ({}) };
});

// ---- Helpers -------------------------------------------------------------

async function renderCareers() {
  const { Careers } = await import("./careers");
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <Careers />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// ---- Tests ---------------------------------------------------------------

describe("Careers page", () => {
  it("shows profession skeleton on initial load, then renders opportunities", async () => {
    await renderCareers();

    // Skeleton status region appears immediately.
    expect(
      screen.getByRole("status", { name: /loading more opportunities/i }),
    ).toBeInTheDocument();

    // Opportunities render once the query settles.
    expect(await screen.findByText("Rhodes Scholarship")).toBeInTheDocument();

    // Skeleton is gone.
    expect(
      screen.queryByRole("status", { name: /loading more opportunities/i }),
    ).not.toBeInTheDocument();
  });

  it("announces 'Search results updated.' after a matching search", async () => {
    const user = userEvent.setup();
    const { container } = await renderCareers();
    await screen.findByText("Rhodes Scholarship");

    const input = screen.getByPlaceholderText(/search title or organization/i);
    await user.type(input, "Rhodes");

    await waitFor(() => {
      const live = container.querySelector('[aria-live="polite"]');
      expect(live?.textContent).toMatch(/search results updated/i);
    });

    // Only the matching opportunity remains visible.
    expect(screen.getByText("Rhodes Scholarship")).toBeInTheDocument();
    expect(screen.queryByText("Opportunity 1")).not.toBeInTheDocument();
  });

  it("announces 'No opportunities match your filters.' for empty results", async () => {
    const user = userEvent.setup();
    const { container } = await renderCareers();
    await screen.findByText("Rhodes Scholarship");

    const input = screen.getByPlaceholderText(/search title or organization/i);
    await user.type(input, "zzz-nothing-matches");

    await waitFor(() => {
      const live = container.querySelector('[aria-live="polite"]');
      expect(live?.textContent).toMatch(/no opportunities match your filters/i);
    });

    // Empty-state copy is also rendered in the list body.
    const empties = await screen.findAllByText(/no opportunities match your filters/i);
    expect(empties.length).toBeGreaterThanOrEqual(2);
  });

  it("shows skeletons again while a new filter is loading", async () => {
    const user = userEvent.setup();
    await renderCareers();
    await screen.findByText("Rhodes Scholarship");

    const input = screen.getByPlaceholderText(/search title or organization/i);
    await user.type(input, "Rhodes");

    // Transient skeleton appears while the filtered query is in flight.
    await waitFor(() => {
      expect(
        screen.queryByRole("status", { name: /loading more opportunities/i }),
      ).toBeInTheDocument();
    });

    // And clears once results arrive.
    await waitFor(() => {
      expect(
        screen.queryByRole("status", { name: /loading more opportunities/i }),
      ).not.toBeInTheDocument();
    });
  });
});