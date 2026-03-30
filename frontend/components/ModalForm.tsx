import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Field,
  Flex,
  HStack,
  Icon,
  Input,
  Portal,
  Separator,
  Stack,
  Text,
} from "@chakra-ui/react";
import { memo, use, useState } from "react";
import type { FC } from "react";
import { LuLogIn } from "react-icons/lu";
import { GoogleIcon } from "./General/CustomIcons";
import { useForm } from "react-hook-form";
import { RegisterForm } from "./RegisterForm";
import { LoginForm } from "./LoginForm";
import { useColorModeValue } from "app/components/ui/color-mode";

type Props = {};
type LoginActions = "login" | "register" | null;

export const ModalForm: FC<Props> = (props) => {
  const [showLogin, setShowLogin] = useState<boolean>(true);
  const buttonShadowBg = useColorModeValue("gray.200", "black");
  const [Action, setLoginAction] = useState<LoginActions>(null);
  const [openForm, setOpenForm] = useState(false);
  return (
    <Dialog.Root open={openForm} onOpenChange={(e) => setOpenForm(e.open)}>
      <Dialog.Trigger asChild>
        <Button variant="outline" rounded={"full"} colorPalette={"green"}>
          <Icon as={LuLogIn} size={"sm"} />
          <span>Sign In</span>
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.CloseTrigger>
              <CloseButton size={"sm"} />
            </Dialog.CloseTrigger>
            <Dialog.Header>
              <Dialog.Title>{showLogin ? "Sign In" : "Sign Up"}</Dialog.Title>
            </Dialog.Header>
            <Separator margin={5} />
            <Box
              bg={buttonShadowBg}
              borderRadius={5}
              marginLeft={6}
              marginRight={6}
              padding={1}
            >
              <Flex alignItems={"stretch"} justifyContent={"center"}>
                <Button
                  variant={showLogin ? "solid" : "ghost"}
                  flex={1}
                  colorPalette={"green"}
                  onClick={() => setShowLogin(true)}
                >
                  Log In
                </Button>
                <Button
                  variant={showLogin ? "ghost" : "solid"}
                  flex={1}
                  colorPalette={"green"}
                  onClick={() => setShowLogin(false)}
                >
                  Register
                </Button>
              </Flex>
            </Box>
            {showLogin ? <LoginForm setOpen={setOpenForm} /> : <RegisterForm setOpen={setOpenForm} />}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
