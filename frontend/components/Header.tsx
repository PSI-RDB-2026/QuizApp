import { Button, Flex, Icon } from "@chakra-ui/react";
import {
  ColorModeButton,
  useColorMode,
  useColorModeValue,
} from "app/components/ui/color-mode";
//import { LogOut } from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { LuLogIn, LuLogOut } from "react-icons/lu";
import { ModalForm } from "./ModalForm";
import { RegisterForm } from "./RegisterForm";
import { useAuth } from "app/providers/AuthProvider";

interface Props {}

export const Header: FC<Props> = (props) => {
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [showRegister, setShowRegister] = useState<boolean>(false);
  const { user, isAuthenticated, logout } = useAuth();
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
          {!isAuthenticated ? (
            <ModalForm />
          ) : (
            <>
              <p>Welcome, {user?.username}!</p>
              <Button
                variant="outline"
                rounded={"full"}
                colorPalette={"green"}
                onClick={() => logout()}
              >
                <Icon as={LuLogOut} size={"sm"} />
              </Button>
            </>
          )}

        </Flex>
      </Flex>
    </>
  );
};
