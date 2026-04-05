import type { Route } from "./+types/PyramidMultiplayerGame";
import { Button, Container, Flex } from "@chakra-ui/react";
import { useNavigate } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function PyramidMultiplayerGame() {
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
        <p>Multiplayer game coming soon!</p>
      </Flex>
    </Container>
  );
}
