//import { Gamepad2 } from "lucide-react";
import { Box, Button, Heading, Icon, Text } from "@chakra-ui/react";
import { useColorModeValue } from "app/components/ui/color-mode";
import { memo } from "react";
import type { FC } from "react";
import { LuGamepad2 } from "react-icons/lu";

interface Props {
  title: string;
  description: string;
  onClick: () => void;
  color: string;
}

export const GameModeCard: FC<Props> = ({
  title,
  description,
  onClick,
  color,
}) => {
  const descColor = useColorModeValue("gray.500", "gray.400");
  const bg = useColorModeValue("white", "black");
  return (
    <Button
      className="group"
      onClick={onClick}
      variant="ghost"
      style={{}}
      _hover={{
        boxShadow: "2xl",
        transform: "translateY(-2px)",
      }}
      display="flex"
      flexDirection="column"
      alignItems="center"
      padding={100}
      borderRadius="3xl"
      background={bg}
      boxShadow="xl"
      transition="all 300ms"
      borderTopWidth="4px"
      borderTopColor={"green.500"}
      shadow={"lg"}
      cursor={"pointer"}
    >
      <Box
        padding={3}
        className={`${color} group-hover:scale-110 transition-transform duration-300`}
        display="flex"
        alignItems="center"
        justifyContent="center"
        color="white"
        mb={6}
        shadow="inner"
      >
        <LuGamepad2 size={710} />
      </Box>

      <Heading
        as="h2"
        size="lg"
        mb={3}
        color={{ base: "gray.900", _dark: "white" }}
      >
        {title}
      </Heading>

      <Text textAlign="center" color={descColor}>
        {description}
      </Text>
    </Button>
  );
};
