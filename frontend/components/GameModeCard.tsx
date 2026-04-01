//import { Gamepad2 } from "lucide-react";
import { Box, Button, Heading, Icon, Text } from "@chakra-ui/react";
import { useColorModeValue } from "app/components/ui/color-mode";
import { memo } from "react";
import type { FC } from "react";
import { LuGamepad2 } from "react-icons/lu";
import { Link, useNavigate } from "react-router";

interface Props {
  title: string;
  description: string;
  navigateTo: string;
  color: string;
}

export const GameModeCard: FC<Props> = ({
  title,
  description,
  navigateTo,
  color,
}) => {
  const descColor = useColorModeValue("gray.500", "gray.400");
  const bg = useColorModeValue("white", "black");
  const navigate = useNavigate();
  return (
    <Button
      onClick={() => navigate(navigateTo)}
      className="group"
      variant="ghost"
      style={{}}
      _hover={{
        boxShadow: "2xl",
        transform: "translateY(-2px)",
      }}
      display="flex"
      flexDirection="column"
      alignItems="center"
      height={"full"}
      borderRadius="3xl"
      boxShadow="xl"
      transition="all 300ms"
      borderTopWidth="4px"
      borderTopColor={"green.500"}
      shadow={"lg"}
      cursor={"pointer"}
      padding={50}
    >
      <Box
        padding={25}
        className={`${color} group-hover:scale-110 transition-transform duration-300`}
        display="flex"
        alignItems="center"
        justifyContent="center"
        color="white"
        m={25}
        borderRadius="lg"
        shadow="inner"
      >
        <Icon as={LuGamepad2} boxSize={10} />
      </Box>

      <Heading
        as="h2"
        size="2xl"
        mb={3}
        color={{ base: "gray.900", _dark: "white" }}
      >
        {title}
      </Heading>

      <Text
        textAlign="center"
        textWrap={"auto"}
        fontSize={15}
        color={descColor}
      >
        {description}
      </Text>
    </Button>
  );
};
