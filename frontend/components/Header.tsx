import { Button, Flex, Icon } from "@chakra-ui/react";
import {
  ColorModeButton,
  useColorMode,
  useColorModeValue,
} from "app/components/ui/color-mode";
//import { LogOut } from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { LuLogIn } from "react-icons/lu";
import { ModalForm } from "./ModalForm";
import { RegisterForm } from "./RegisterForm";

interface Props {}

export const Header: FC<Props> = (props) => {
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [showRegister, setShowRegister] = useState<boolean>(false);
  const bg = useColorModeValue("white", "gray.800");
  const color = useColorModeValue("gray.800", "white");
  useEffect(() => {
    console.log(showLogin);
  }, [showLogin]);
  return (
    <>
      <Flex
        bg={bg}
        color={color}
        justifyContent="space-between"
        alignItems="center"
        padding={15}
        shadow={"lg"}
      >
        <h2>Logo</h2>
        <Flex gap={"1rem"} alignItems="center">
          <ColorModeButton colorPalette={"green"} />
          <ModalForm />
          {/*<LogOut />*/}
        </Flex>
      </Flex>
    </>
  );
};
