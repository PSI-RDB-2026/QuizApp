import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("app/components/ui/color-mode", () => ({
  useColorModeValue: (light: string) => light,
}));

import Leaderboards from "../Leaderboards";
import { meta as leaderboardsMeta } from "../Leaderboards";

const system = createSystem(defaultConfig);

function renderLeaderboards() {
  return render(
    <ChakraProvider value={system}>
      <Leaderboards />
    </ChakraProvider>,
  );
}

describe("Leaderboards", () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it("renders the first page and paginates to the next page", async () => {
    const user = userEvent.setup();
    renderLeaderboards();

    expect(
      await screen.findByText("ProGamer2024", { selector: "p" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Showing 1-10 of 30 players")).toBeInTheDocument();

    await user.click(screen.getByLabelText(/next page/i));

    await waitFor(() => {
      expect(
        screen.getByText("GreenGenius", { selector: "p" }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Showing 11-20 of 30 players")).toBeInTheDocument();
  });

  it("exposes the route metadata", () => {
    expect(leaderboardsMeta()).toEqual([
      { title: "Leaderboards - AZ Quizz" },
      {
        name: "description",
        content:
          "View the top players on the leaderboard ranked by ELO rating.",
      },
    ]);
  });
});
