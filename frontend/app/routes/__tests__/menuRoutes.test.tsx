import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("components/GameModeCard", () => ({
  GameModeCard: ({
    title,
    description,
    navigateTo,
  }: {
    title: string;
    description: string;
    navigateTo: string;
  }) => (
    <button type="button" onClick={() => navigateMock(navigateTo)}>
      <span>{title}</span>
      <span>{description}</span>
    </button>
  ),
}));

import MainMenu from "../MainMenu";
import PyramidGameMenu from "../PyramidGameMenu";
import { meta as mainMenuMeta } from "../MainMenu";
import { meta as pyramidGameMenuMeta } from "../PyramidGameMenu";

const system = createSystem(defaultConfig);

function renderWithProvider(ui: ReactElement) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

describe("menu routes", () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it("renders the main menu card", () => {
    renderWithProvider(<MainMenu />);

    expect(screen.getByText("AZ Pyramid")).toBeInTheDocument();
    expect(
      screen.getByText("Conquer the pyramid of letters."),
    ).toBeInTheDocument();
  });

  it("renders the pyramid game menu cards and back button", async () => {
    const user = userEvent.setup();
    renderWithProvider(<PyramidGameMenu />);

    expect(screen.getByText("Local Game")).toBeInTheDocument();
    expect(screen.getByText("Multiplayer Game")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /back to main menu/i }),
    );

    expect(navigateMock).toHaveBeenCalledWith("/");
  });

  it("exposes the route metadata", () => {
    expect(mainMenuMeta({} as never)).toEqual([
      { title: "QuizApp" },
      { name: "description", content: "Welcome to React Router!" },
    ]);

    expect(pyramidGameMenuMeta({} as never)).toEqual([
      { title: "QuizApp" },
      { name: "description", content: "Welcome to React Router!" },
    ]);
  });
});
