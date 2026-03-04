import type { Route } from "./+types/home";
import Welcome from "../welcome/welcome";
import axios from "axios";
import { useState } from "react";
import React from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  
  const [hello, setHello] = useState("Frontend is running!");

  const getHello = () => {
    axios.get("http://localhost:8000/api").then((response) => {
      console.log(response);
      setHello(response.data);
    });
  }


  return <Welcome text={hello} />;
}
