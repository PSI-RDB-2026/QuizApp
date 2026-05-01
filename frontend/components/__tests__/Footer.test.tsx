import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Footer } from "../Footer";

describe("Footer", () => {
  it("renders the footer heading", () => {
    render(<Footer />);

    expect(screen.getByRole("heading", { name: "Footer" })).toBeInTheDocument();
  });
});
