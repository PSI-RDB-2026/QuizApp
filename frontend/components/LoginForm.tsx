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
import { useAuth } from "app/providers/AuthProvider";
import { getLogin } from "api/api";

interface Props {
  setOpen: (open: boolean) => void;
}

interface FormValues {
  username: string;
  password: string;
}

export const LoginForm: FC<Props> = ({ setOpen }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();
  const { login } = useAuth();
  const buttonBg = useColorModeValue("green.400", "green.600");

  const onSubmit = handleSubmit(async (data: FormValues) => {
    try {
      const response = await getLogin(data);
      if (response.data?.access_token) {
        // Store user data, token and update auth context
        login({
          ...data,
          access_token: response.data.access_token,
        });
        setOpen(false);
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  });

  return (
    <Dialog.Body>
      <form onSubmit={onSubmit}>
        <Field.Root id={"username"} invalid={!!errors.email}>
          <Field.Label>Email</Field.Label>
          <Input
            {...register("email", { required: "Email is required" })}
            placeholder="Enter your email"
          />
          <Field.ErrorText width={"full"}>
            <Field.ErrorIcon />
            {errors.email && errors.email.message}
          </Field.ErrorText>
        </Field.Root>

        <Field.Root id={"password"} invalid={!!errors.password} marginTop={4}>
          <Field.Label>Password</Field.Label>
          <Input
            {...register("password", { required: "Password is required" })}
            type="password"
            placeholder="Enter your password"
          />
          <Field.ErrorText>
            {errors.password && errors.password.message}
          </Field.ErrorText>
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
