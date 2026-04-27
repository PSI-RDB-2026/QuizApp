//import { Gamepad2 } from "lucide-react";
import { Box, Button, Heading, Icon, Text } from "@chakra-ui/react";
import { useColorModeValue } from "app/components/ui/color-mode";
import type { FC } from "react";
import { LuGamepad2 } from "react-icons/lu";
import { useNavigate } from "react-router";

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
  const navigate = useNavigate();
  return (
    <Button
      onClick={() => navigate(navigateTo)}
      className="group"
      variant="ghost"
      _hover={{
        boxShadow: "2xl",
        transform: "translateY(-2px)",
      }}
      display="flex"
      flexDirection="column"
      alignItems="center"
      flex={{ base: "1 1 auto", md: "1 1 360px" }}
      width="full"
      maxWidth={{ base: "100%", md: "560px" }}
      minHeight={{ base: "300px", md: "360px" }}
      height={"full"}
      borderRadius="3xl"
      boxShadow="xl"
      transition="all 300ms"
      borderTopWidth="4px"
      borderTopColor={"green.500"}
      shadow={"lg"}
      cursor={"pointer"}
      padding={{ base: 6, md: 10 }}
    >
      <Box
        padding={{ base: 5, md: 6 }}
        className={`${color} group-hover:scale-110 transition-transform duration-300`}
        display="flex"
        alignItems="center"
        justifyContent="center"
        color="white"
        m={{ base: 4, md: 6 }}
        borderRadius="lg"
        shadow="inner"
      >
        <Icon as={LuGamepad2} boxSize={10} />
      </Box>

      <Heading
        as="h2"
        size={{ base: "xl", md: "2xl" }}
        mb={3}
        color={{ base: "gray.900", _dark: "white" }}
        textAlign="center"
      >
        {title}
      </Heading>

      <Text
        textAlign="center"
        textWrap={"balance"}
        fontSize={{ base: "sm", md: "md" }}
        color={descColor}
      >
        {description}
      </Text>
    </Button>
  );
};
