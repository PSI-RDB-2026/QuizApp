/**
 * Component tests for Welcome component.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Welcome from "../../welcome/welcome";

describe("Welcome Component", () => {
  it("renders the passed message", () => {
    render(<Welcome text={{ message: "Hello Quiz" }} />);

    expect(screen.getByRole("heading", { name: "Hello Quiz" })).toBeInTheDocument();
  });

  it("updates rendered text based on props", () => {
    const { rerender } = render(<Welcome text={{ message: "Loading..." }} />);
    expect(screen.getByRole("heading", { name: "Loading..." })).toBeInTheDocument();

    rerender(<Welcome text={{ message: "Backend Connected" }} />);
    expect(screen.getByRole("heading", { name: "Backend Connected" })).toBeInTheDocument();
  });
});
