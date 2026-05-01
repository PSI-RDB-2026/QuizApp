import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("app/components/ui/color-mode", () => ({
  useColorModeValue: (light: string) => light,
}));

import { GameModeCard } from "../GameModeCard";

const system = createSystem(defaultConfig);

function renderCard() {
  return render(
    <ChakraProvider value={system}>
      <GameModeCard
        title="Local Game"
        description="Conquer the pyramid on your own."
        navigateTo="/localGame"
        color="bg-primary"
      />
    </ChakraProvider>,
  );
}

describe("GameModeCard", () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it("renders the card content and navigates on click", async () => {
    const user = userEvent.setup();
    renderCard();

    expect(
      screen.getByRole("heading", { name: "Local Game" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Conquer the pyramid on your own."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /local game/i }));

    expect(navigateMock).toHaveBeenCalledWith("/localGame");
  });

  it("renders alternate card content", () => {
    render(
      <ChakraProvider value={system}>
        <GameModeCard
          title="Multiplayer Game"
          description="Play together."
          navigateTo="/multiplayerGame"
          color="bg-primary"
        />
      </ChakraProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Multiplayer Game" }),
    ).toBeInTheDocument();
  });
});
