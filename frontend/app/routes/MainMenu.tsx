import type { Route } from "./+types/MainMenu";
import axios from "axios";
import { useState, useEffect } from "react";
import { GameModeCard } from "components/GameModeCard";
import { Container, Flex } from "@chakra-ui/react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function MainMenu() {
  const [hello, setHello] = useState({ message: "Loading..." });

  useEffect(() => {
    const getHello = () => {
      // Use relative path - reverse proxy will handle routing to backend
      const apiUrl = "/api";
      axios
        .get(apiUrl)
        .then((response) => {
          console.log(response);
          setHello(response.data);
        })
        .catch((error) => {
          console.error("Error fetching from API:", error);
          setHello({ message: "Failed to connect to backend" });
        });
    };
    getHello();
  }, []);

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
