import {
  Button,
  Dialog,
  Field,
  HStack,
  Input,
  Separator,
  Text,
} from "@chakra-ui/react";
import { useColorModeValue } from "app/components/ui/color-mode";
import type { FC } from "react";
import { useForm } from "react-hook-form";
import { GoogleIcon } from "./General/CustomIcons";

interface Props {}

interface FormValues {
  username: string;
  password: string;
}
export const LoginForm: FC<Props> = (props) => {
  const { register, handleSubmit } = useForm<FormValues>();
  const buttonBg = useColorModeValue("green.400", "green.600");
  const onSubmit = handleSubmit((data: FormValues) => {
    console.log(data);
  });

  return (
    <Dialog.Body>
      <form onSubmit={onSubmit}>
        <Field.Root id={"username"}>
          <Field.Label>Username</Field.Label>
          <Input {...register("username")} placeholder="Enter your username" />
          <Field.ErrorText>Username is required</Field.ErrorText>
        </Field.Root>

        <Field.Root id={"password"} marginTop={4}>
          <Field.Label>Password</Field.Label>
          <Input
            {...register("password")}
            type="password"
            placeholder="Enter your password"
          />
          <Field.ErrorText>Password is required</Field.ErrorText>
        </Field.Root>

        <HStack marginTop={6} marginBottom={3}>
          <Button variant="solid" flex={1} type="submit" colorPalette={"green"}>
            Sign In
          </Button>
        </HStack>
      </form>
      <Dialog.Footer
        padding={0}
        justifyContent={"center"}
        alignItems={"stretch"}
        flexDir={"column"}
      >
        <HStack>
          <Separator flex={1} />
          <Text flexShrink={0}>OR</Text>
          <Separator flex={1} />
        </HStack>
        <HStack>
          <Button variant="outline" flex={1} colorPalette={"green"}>
            <GoogleIcon />
            <span>Continue with Google</span>
          </Button>
        </HStack>
      </Dialog.Footer>
    </Dialog.Body>
  );
};
