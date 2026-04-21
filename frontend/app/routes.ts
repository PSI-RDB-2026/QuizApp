import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/MainMenu.tsx"),
  route("pyramidGameMenu", "./routes/PyramidGameMenu.tsx"),
  route("pyramidGameMenu/localGame", "./routes/PyramidLocalGame.tsx"),
  route(
    "pyramidGameMenu/multiplayerGame",
    "./routes/PyramidMultiplayerGame.tsx",
  ),
  route("leaderboards", "./routes/Leaderboards.tsx"),
] satisfies RouteConfig;
