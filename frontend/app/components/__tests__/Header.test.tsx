import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();
const logoutMock = vi.fn();

let authState: {
  user: { firebaseUser: { displayName: string } } | null;
  logout: typeof logoutMock;
} = {
  user: null,
  logout: logoutMock,
};

vi.mock("react-router", () => ({
  Link: ({ children, to }: { children: any; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => navigateMock,
}));

vi.mock("../../../components/ModalForm", () => ({
  ModalForm: () => <button type="button">Sign In</button>,
}));

vi.mock("../../../components/RegisterForm", () => ({
  RegisterForm: () => <div />,
}));

vi.mock("../../../components/LoginForm", () => ({
  LoginForm: () => <div />,
}));

vi.mock("app/firebase/authentication", () => ({
  googleLogin: vi.fn(),
  registerUser: vi.fn(),
}));

vi.mock("app/providers/AuthProvider", () => ({
  useAuth: () => authState,
}));

vi.mock("app/components/ui/color-mode", () => ({
  ColorModeButton: () => (
    <button type="button" aria-label="Toggle color mode" />
  ),
}));

import { Header } from "../../../components/Header";

const system = createSystem(defaultConfig);

function renderHeader() {
  return render(
    <ChakraProvider value={system}>
      <Header />
    </ChakraProvider>,
  );
}

describe("Header", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    logoutMock.mockReset();
    authState = { user: null, logout: logoutMock };
  });

  it("renders the sign-in flow when no user is logged in", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "QuizApp" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Leaderboards" }),
    ).toBeInTheDocument();
  });

  it("navigates to leaderboards from the header", async () => {
    const user = userEvent.setup();

    renderHeader();

    await user.click(screen.getByRole("button", { name: "Leaderboards" }));

    expect(navigateMock).toHaveBeenCalledWith("/leaderboards");
  });

  it("renders the authenticated state and logs out", async () => {
    const user = userEvent.setup();
    authState = {
      user: { firebaseUser: { displayName: "Quiz Champion" } },
      logout: logoutMock,
    };

    renderHeader();

    expect(screen.getByText("Welcome, Quiz Champion!")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button")[2]);

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
