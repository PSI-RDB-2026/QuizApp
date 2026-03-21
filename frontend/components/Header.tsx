import { Button, Flex, Icon } from "@chakra-ui/react";
import {
  ColorModeButton,
  useColorMode,
  useColorModeValue,
} from "app/components/ui/color-mode";
//import { LogOut } from "lucide-react";
import type { FC } from "react";
import { LuLogIn } from "react-icons/lu";

interface Props {}

export const Header: FC<Props> = (props) => {
  const bg = useColorModeValue("white", "gray.800");
  const color = useColorModeValue("gray.800", "white");
  return (
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
        <Button colorPalette={"green"} variant="outline" rounded={"full"}>
          <Icon as={LuLogIn} size={"sm"} />
          <span>Sign In</span>
        </Button>
        {/*<LogOut />*/}
      </Flex>
    </Flex>
  );
};
