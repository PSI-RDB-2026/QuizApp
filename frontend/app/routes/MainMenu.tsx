import type { Route } from "./+types/MainMenu";
import axios from "axios";
import { useState, useEffect } from "react";
import { GameModeCard } from "components/GameModeCard";
import { Container, Flex } from "@chakra-ui/react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "QuizApp" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function MainMenu() {
  return (
    <Container maxW="container.lg" padding={25}>
      <Flex justifyContent={"center"}>
        <GameModeCard
          title="AZ Pyramida"
          description="Conquer the pyramid of letters."
          navigateTo={"/pyramidGameMenu"}
          color="bg-primary"
        />
      </Flex>
    </Container>
  );
}
