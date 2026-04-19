import type { Route } from "./+types/PyramidGameMenu";
import { GameModeCard } from "components/GameModeCard";
import { Button, Container, Flex } from "@chakra-ui/react";
import { useNavigate } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "QuizApp" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function PyramidGameMenu() {
  const navigate = useNavigate();
  return (
    <Container
      maxW="container.xl"
      px={{ base: 4, md: 6 }}
      py={{ base: 6, md: 8 }}
    >
      <Button
        onClick={() => navigate("/")}
        variant={"surface"}
        colorPalette={"green"}
        mb={5}
      >
        &larr; Back to Main Menu
      </Button>
      <Flex
        direction={{ base: "column", md: "row" }}
        justifyContent={"center"}
        alignItems={{ base: "stretch", md: "stretch" }}
        py={{ base: 4, md: 8 }}
        gap={{ base: 4, md: 6 }}
      >
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
