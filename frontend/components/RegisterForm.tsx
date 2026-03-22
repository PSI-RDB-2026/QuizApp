import {
  Button,
  Dialog,
  Field,
  Flex,
  HStack,
  Input,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { FC } from "react";
import { GoogleIcon } from "./General/CustomIcons";
import { useForm, type UseFormRegister } from "react-hook-form";
import { useColorModeValue } from "app/components/ui/color-mode";

interface Props {}
interface FormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}
export const RegisterForm: FC<Props> = () => {
  const { register, handleSubmit } = useForm<FormValues>();
  const buttonBg = useColorModeValue("green.500", "green.600");

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
        <Field.Root id={"email"} marginTop={4}>
          <Field.Label>Email</Field.Label>
          <Input
            {...register("email")}
            type="email"
            placeholder="Enter your email"
          />
          <Field.ErrorText>Email is required</Field.ErrorText>
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
        <Field.Root id={"confirmPassword"} marginTop={4}>
          <Field.Label>Confirm Password</Field.Label>
          <Input
            {...register("confirmPassword")}
            type="password"
            placeholder="Confirm your password"
          />
          <Field.ErrorText>Passwords do not match</Field.ErrorText>
        </Field.Root>
        <HStack marginTop={6} marginBottom={3}>
          <Button variant="solid" flex={1} type="submit" colorPalette={"green"}>
            Sign Up
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
