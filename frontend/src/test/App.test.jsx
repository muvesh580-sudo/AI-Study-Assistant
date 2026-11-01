import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "../App";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const conversation = {
  _id: "1",
  question: "What is DNA?",
  mode: "quiz",
  answer: "**DNA** answer",
  createdAt: "2026-01-01T00:00:00.000Z",
};

// Routes fetch by path. A handler may be a Response factory or a pending promise.
const stubApi = (routes) => {
  const fetchMock = vi.fn(async (url, options) => {
    const path = new URL(url).pathname;
    const route = routes[path];

    if (!route) throw new Error(`Unexpected request: ${path}`);

    return route(options);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const callsTo = (fetchMock, path) =>
  fetchMock.mock.calls.filter(([url]) => new URL(url).pathname === path);

describe("App", () => {
  it("shows the login screen without a token and makes no API calls", () => {
    const fetchMock = stubApi({});

    render(<App />);

    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs in, stores the token and loads the history", async () => {
    const user = userEvent.setup();
    stubApi({
      "/api/login": () => json({ token: "abc", user: {} }),
      "/api/conversations": () => json([conversation]),
    });

    render(<App />);
    await user.type(screen.getByLabelText("Email"), "a@test.local");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("What is DNA?")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBe("abc");
  });

  it("shows the server's error when login fails", async () => {
    const user = userEvent.setup();
    stubApi({
      "/api/login": () => json({ error: "Invalid email or password" }, 401),
    });

    render(<App />);
    await user.type(screen.getByLabelText("Email"), "a@test.local");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
  });

  it("registers and then logs in", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi({
      "/api/register": () => json({ user: {} }, 201),
      "/api/login": () => json({ token: "abc", user: {} }),
      "/api/conversations": () => json([]),
    });

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Register" }));
    await user.type(screen.getByLabelText("Full Name"), "Ada");
    await user.type(screen.getByLabelText("Email"), "a@test.local");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(await screen.findByRole("button", { name: "Logout" })).toBeInTheDocument();
    expect(callsTo(fetchMock, "/api/register")).toHaveLength(1);
  });

  it("restores the session from a stored token", async () => {
    localStorage.setItem("token", "abc");
    const fetchMock = stubApi({
      "/api/conversations": () => json([conversation]),
    });

    render(<App />);

    expect(await screen.findByText("What is DNA?")).toBeInTheDocument();
    const [, options] = callsTo(fetchMock, "/api/conversations")[0];
    expect(options.headers.Authorization).toBe("Bearer abc");
  });

  it("asks a question and adds it to the history without refetching", async () => {
    const user = userEvent.setup();
    localStorage.setItem("token", "abc");
    const fetchMock = stubApi({
      "/api/conversations": () => json([]),
      "/api/ask": () => json({ answer: "**Bold** reply", conversation }),
    });

    render(<App />);
    await user.click(screen.getByRole("button", { name: "❓ Quiz" }));
    await user.type(screen.getByLabelText("Your question"), "Cells");
    await user.click(screen.getByRole("button", { name: "Ask AI" }));

    const bold = await screen.findByText("Bold");
    expect(bold.tagName).toBe("STRONG");
    expect(screen.getByText("What is DNA?")).toBeInTheDocument();

    const [, options] = callsTo(fetchMock, "/api/ask")[0];
    expect(JSON.parse(options.body)).toEqual({ question: "Cells", mode: "quiz" });
    await waitFor(() =>
      expect(callsTo(fetchMock, "/api/conversations")).toHaveLength(1)
    );
  });

  it("reloads the history when the backend doesn't return the saved conversation", async () => {
    const user = userEvent.setup();
    localStorage.setItem("token", "abc");
    let historyCalls = 0;
    const fetchMock = stubApi({
      "/api/conversations": () => json(historyCalls++ === 0 ? [] : [conversation]),
      "/api/ask": () => json({ question: "Cells", answer: "Old backend reply" }),
    });

    render(<App />);
    await screen.findByRole("button", { name: "Logout" });
    await user.type(screen.getByLabelText("Your question"), "Cells");
    await user.click(screen.getByRole("button", { name: "Ask AI" }));

    expect(await screen.findByText("Old backend reply")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /What is DNA\?/ })).toBeInTheDocument();
    expect(callsTo(fetchMock, "/api/conversations").length).toBeGreaterThanOrEqual(2);
  });

  it("opens a past conversation with the keyboard", async () => {
    const user = userEvent.setup();
    localStorage.setItem("token", "abc");
    stubApi({ "/api/conversations": () => json([conversation]) });

    render(<App />);
    const item = await screen.findByRole("button", { name: /What is DNA\?/ });
    item.focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByText("DNA")).toBeInTheDocument();
    expect(screen.getByLabelText("Your question")).toHaveValue("What is DNA?");
    expect(screen.getByRole("button", { name: "❓ Quiz" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("scrolls to the answer once it has rendered", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    localStorage.setItem("token", "abc");
    stubApi({ "/api/conversations": () => json([conversation]) });

    render(<App />);
    await user.click(await screen.findByRole("button", { name: /What is DNA\?/ }));
    await screen.findByText("DNA");

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    delete Element.prototype.scrollIntoView;
  });

  it("clears one user's data on logout so the next user can't see it", async () => {
    const user = userEvent.setup();
    localStorage.setItem("token", "abc");
    stubApi({
      "/api/conversations": () => json([conversation]),
      "/api/login": () => json({ token: "second", user: {} }),
    });

    const { container } = render(<App />);
    await user.click(await screen.findByRole("button", { name: /What is DNA\?/ }));
    await screen.findByRole("heading", { name: /AI Answer/ });
    await user.click(screen.getByRole("button", { name: "Logout" }));

    expect(localStorage.getItem("token")).toBeNull();
    expect(container).not.toHaveTextContent("What is DNA?");

    stubApi({
      "/api/login": () => json({ token: "second", user: {} }),
      "/api/conversations": () => json([]),
    });
    await user.type(screen.getByLabelText("Email"), "b@test.local");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Login" }));

    const textarea = await screen.findByLabelText("Your question");
    expect(textarea).toHaveValue("");
    expect(screen.queryByRole("heading", { name: /AI Answer/ })).not.toBeInTheDocument();
  });

  it("ignores an answer that arrives after logout", async () => {
    const user = userEvent.setup();
    localStorage.setItem("token", "abc");
    stubApi({
      "/api/conversations": () => json([]),
      "/api/ask": (options) =>
        new Promise((resolve, reject) => {
          options.signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError"))
          );
        }),
    });

    const { container } = render(<App />);
    await user.type(screen.getByLabelText("Your question"), "Cells");
    await user.click(screen.getByRole("button", { name: "Ask AI" }));
    await user.click(screen.getByRole("button", { name: "Logout" }));

    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
    expect(within(container).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("returns to login with a notice when the token has expired", async () => {
    localStorage.setItem("token", "expired");
    stubApi({
      "/api/conversations": () => json({ error: "Invalid or expired token" }, 401),
    });

    render(<App />);

    expect(await screen.findByRole("status")).toHaveTextContent("session has expired");
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("shows an error when the history can't be loaded", async () => {
    localStorage.setItem("token", "abc");
    stubApi({
      "/api/conversations": () => json({ error: "Failed to fetch conversations" }, 500),
    });

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to fetch conversations"
    );
  });

  it("explains non-JSON error pages and network failures", async () => {
    const user = userEvent.setup();
    localStorage.setItem("token", "abc");
    stubApi({
      "/api/conversations": () => json([]),
      "/api/ask": () => new Response("<html>Bad Gateway</html>", { status: 502 }),
    });

    render(<App />);
    await user.type(screen.getByLabelText("Your question"), "Cells");
    await user.click(screen.getByRole("button", { name: "Ask AI" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");

    stubApi({
      "/api/ask": () => Promise.reject(new TypeError("Failed to fetch")),
    });
    await user.click(screen.getByRole("button", { name: "Ask AI" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Could not reach the server")
    );
  });

  it("doesn't submit a blank question", async () => {
    const user = userEvent.setup();
    localStorage.setItem("token", "abc");
    const fetchMock = stubApi({ "/api/conversations": () => json([]) });

    render(<App />);
    await user.type(screen.getByLabelText("Your question"), "   ");
    await user.click(screen.getByRole("button", { name: "Ask AI" }));

    expect(callsTo(fetchMock, "/api/ask")).toHaveLength(0);
  });

  it("renders AI output safely", async () => {
    const user = userEvent.setup();
    localStorage.setItem("token", "abc");
    stubApi({
      "/api/conversations": () =>
        json([
          {
            ...conversation,
            answer: "[bad](javascript:alert(1)) <img src=x onerror=alert(1)> [ok](https://example.com)",
          },
        ]),
    });

    const { container } = render(<App />);
    await user.click(await screen.findByRole("button", { name: /What is DNA\?/ }));
    await screen.findByRole("link", { name: "ok" });

    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).not.toContain("javascript:");
    expect(screen.getByRole("link", { name: "ok" })).toHaveAttribute(
      "rel",
      "noopener noreferrer"
    );
  });
});
