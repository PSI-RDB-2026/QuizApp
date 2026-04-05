import { Footer } from "components/Footer";
import { Header } from "components/Header";
import { memo } from "react";
import type { FC } from "react";
import { Outlet } from "react-router";
import { AuthProvider } from "./providers/AuthProvider";

interface Props {}

export const Wrapper: FC<Props> = (props) => {
  return (
    <>
      <AuthProvider>
        <Header />
        <Outlet />
      </AuthProvider>
    </>
  );
};
