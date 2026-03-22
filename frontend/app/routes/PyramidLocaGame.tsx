import type { Route } from "./+types/PyramidLocaGame";
import axios from "axios";
import { useState, useEffect } from "react";
import React from "react";
import { GameModeCard } from "components/GameModeCard";
import { Button, Container, Flex } from "@chakra-ui/react";
import { Link, useNavigate } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function PyramidLocalGame() {
  const navigate = useNavigate();
  return (
    <Container maxW="container.lg" padding={25}>
      <Flex justifyContent={"center"} padding={25} gap={5}>
        <p>Local game coming soon!</p>
      </Flex>
    </Container>
  );
}
