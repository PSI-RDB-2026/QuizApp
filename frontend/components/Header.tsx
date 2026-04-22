import { Button, Flex, Icon } from "@chakra-ui/react";
import { ColorModeButton } from "app/components/ui/color-mode";
//import { LogOut } from "lucide-react";
import { useState, type FC } from "react";
import { LuLogIn, LuLogOut } from "react-icons/lu";
import { useNavigate } from "react-router";
import { ModalForm } from "./ModalForm";
import { RegisterForm } from "./RegisterForm";
import { useAuth } from "app/providers/AuthProvider";

interface Props {}

export const Header: FC<Props> = (props) => {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [showRegister, setShowRegister] = useState<boolean>(false);
  const auth = useAuth();
  const user = auth?.user;
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const logout = auth?.logout ?? (() => undefined);
  return (
    <>
      <Flex
        bg="bg"
        color="fg"
        justifyContent="space-between"
        alignItems="center"
        padding={15}
        shadow={"lg"}
      >
        <h2>QuizzApp</h2>
        <Flex gap={"1rem"} alignItems="center">
          <ColorModeButton colorPalette={"green"} />
          <Button
            variant="outline"
            colorPalette={"cyan"}
            onClick={() => navigate("/leaderboards")}
          >
            Leaderboards
          </Button>
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
