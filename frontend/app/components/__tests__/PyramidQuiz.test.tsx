/**
 * Component tests for Home route component.
 */
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Home from "../../routes/home";

describe("Home Route", () => {
  it("renders loading state immediately", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Loading..." })).toBeInTheDocument();
  });

  it("renders backend message from mocked /api endpoint", async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Hello World, V2" })).toBeInTheDocument();
    });
  });
});
