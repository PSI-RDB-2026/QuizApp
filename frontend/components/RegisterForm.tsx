import {
  Button,
  Dialog,
  Field,
  HStack,
  Input,
  Separator,
  Text,
} from "@chakra-ui/react";
import type { AxiosResponse } from "axios";
import type { FC } from "react";
import { useState } from "react";
import { GoogleIcon } from "./General/CustomIcons";
import { useForm } from "react-hook-form";
import {
  postRegister,
  type ApiErrorResponse,
  type TokenResponse,
} from "api/api";
import { useAuth } from "app/providers/AuthProvider";
import { googleLogin, registerUser } from "app/firebase/authentication";

interface Props {
  setOpen: (open: boolean) => void;
}
interface FormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type FeedbackState = {
  status: "error" | "success";
  message: string;
};

function getErrorMessage(error: ApiErrorResponse): string {
  if (typeof error.detail === "string" && error.detail.trim()) {
    return error.detail;
  }

  if (typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  return "Registration failed. Please try again.";
}

function isTokenSuccessResponse(
  response: AxiosResponse<TokenResponse> | ApiErrorResponse,
): response is AxiosResponse<TokenResponse> {
  if (
    typeof response !== "object" ||
    response === null ||
    !("data" in response)
  ) {
    return false;
  }

  const payload = response.data;
  return (
    typeof payload === "object" && payload !== null && "access_token" in payload
  );
}

export const RegisterForm: FC<Props> = ({ setOpen }) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const { login } = useAuth();

  const googleLoginHandler = async () => {
    var user: any = null;
    try {
      user = await googleLogin();
    } catch (error) {
      console.error("Errot logging in with Google:", error);
    }
    if (user) {
      login(user);
      setOpen(false);
    }
  };

  const onSubmit = handleSubmit(async (data: FormValues) => {
    console.log("Form data:", data);
    if (data.password !== data.confirmPassword) {
      console.error("Passwords do not match");
      return;
    }
    const registerInfo = {
      username: data.username,
      email: data.email,
      password: data.password,
    };
    var user: any = null;
    try {
      user = await registerUser(data.email, data.password);
    } catch (error) {
      console.error("Firebase registration failed:", error);
      setFeedback({
        status: "error",
        message: "An unexpected error occurred. Please try again.",
      });
      return;
    }
    console.log("Registered user:", user);
    login(user);
    setFeedback({
      status: "success",
      message: "Account created successfully.",
    });
    setOpen(false);
  });

  const passwordValue = watch("password");

  return (
    <Dialog.Body>
      <form onSubmit={onSubmit}>
        <Field.Root id={"username"} invalid={!!errors.username}>
          <Field.Label>Username</Field.Label>
          <Input
            {...register("username", {
              required: "Username is required",
            })}
            placeholder="Enter your username"
          />
          <Field.ErrorText>{errors.username?.message}</Field.ErrorText>
        </Field.Root>
        <Field.Root id={"email"} marginTop={4} invalid={!!errors.email}>
          <Field.Label>Email</Field.Label>
          <Input
            {...register("email", {
              required: "Email is required",
            })}
            type="email"
            placeholder="Enter your email"
          />
          <Field.ErrorText>{errors.email?.message}</Field.ErrorText>
        </Field.Root>
        <Field.Root id={"password"} marginTop={4} invalid={!!errors.password}>
          <Field.Label>Password</Field.Label>
          <Input
            {...register("password", {
              required: "Password is required",
            })}
            type="password"
            placeholder="Enter your password"
          />
          <Field.ErrorText>{errors.password?.message}</Field.ErrorText>
        </Field.Root>
        <Field.Root
          id={"confirmPassword"}
          marginTop={4}
          invalid={!!errors.confirmPassword}
        >
          <Field.Label>Confirm Password</Field.Label>
          <Input
            {...register("confirmPassword", {
              required: "Please confirm your password",
              validate: (value) =>
                value === passwordValue || "Passwords do not match",
            })}
            type="password"
            placeholder="Confirm your password"
          />
          <Field.ErrorText>{errors.confirmPassword?.message}</Field.ErrorText>
        </Field.Root>
        <HStack marginTop={6} marginBottom={3}>
          <Button
            variant="solid"
            flex={1}
            type="submit"
            colorPalette={"green"}
            loading={isSubmitting}
          >
            Sign Up
          </Button>
        </HStack>

        {feedback ? (
          <Text
            fontSize="sm"
            color={feedback.status === "error" ? "red.500" : "green.500"}
            mb={2}
          >
            {feedback.message}
          </Text>
        ) : null}
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
          <Button
            variant="outline"
            flex={1}
            colorPalette={"green"}
            onClick={googleLoginHandler}
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </Button>
        </HStack>
      </Dialog.Footer>
    </Dialog.Body>
  );
};
