import type { Route } from "./+types/Main";
import Welcome from "../welcome/welcome";
import axios from "axios";
import { useState, useEffect } from "react";
import React from "react";
import { GameModeCard } from "components/GameModeCard";
import { Container, Flex } from "@chakra-ui/react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Main() {
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
    <Container maxW="container.lg" className="py-8">
      <Flex justifyContent={"center"} padding={25}>
        <GameModeCard
          title="AZ Kvíz"
          description="Conquer the pyramid of letters."
          onClick={() => console.log("Single Player clicked")}
          color="bg-primary"
        />
      </Flex>
    </Container>
  );
}
