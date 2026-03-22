import { Footer } from "components/Footer";
import { Header } from "components/Header";
import { memo } from "react";
import type { FC } from "react";
import { Outlet } from "react-router";

interface Props {}

export const Wrapper: FC<Props> = (props) => {
  return (
    <div>
      <Header />
      <Outlet />
    </div>
  );
};
