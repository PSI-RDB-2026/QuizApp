import type { Route } from "./+types/PyramidGameMenu";
import { GameModeCard } from "components/GameModeCard";
import { Button, Container, Flex } from "@chakra-ui/react";
import { useNavigate } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function PyramidGameMenu() {
  const navigate = useNavigate();
  return (
    <Container maxW="container.lg" padding={25}>
      <Button
        onClick={() => navigate("/")}
        variant={"surface"}
        colorPalette={"green"}
        mb={5}
      >
        &larr; Back to Main Menu
      </Button>
      <Flex justifyContent={"center"} padding={25} gap={5}>
        <GameModeCard
          title="Local Game"
          description="Conquer the pyramid of letters on your own."
          navigateTo={"localGame"}
          color="bg-primary"
        />
        <GameModeCard
          title="Multiplayer Game"
          description="Conquer the pyramid of letters with your friends."
          navigateTo={"multiplayerGame"}
          color="bg-primary"
        />
      </Flex>
    </Container>
  );
}
