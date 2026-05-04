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
import { useForm } from "react-hook-form";
import { GoogleIcon } from "./General/CustomIcons";
import { useAuth } from "app/providers/AuthProvider";
import { type ApiErrorResponse, type TokenResponse } from "api/api";
import { googleLogin, loginUser } from "app/firebase/authentication";

interface Props {
  setOpen: (open: boolean) => void;
}

interface FormValues {
  email: string;
  password: string;
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

  return "Login failed. Please check your credentials and try again.";
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

export const LoginForm: FC<Props> = ({ setOpen }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const { login } = useAuth();

  const googleLoginHandler = async () => {
    var user: any = null;
    try {
      user = await googleLogin();
    } catch (error) {
      console.error("Error logging in with Google:", error);
    }
    if (user) {
      login(user);
      setOpen(false);
    }
  };

  const onSubmit = handleSubmit(async (data: FormValues) => {
    var user: any = null;
    try {
      user = await loginUser(data.email, data.password);
    } catch (error) {
      console.error("Login failed:", error);
      setFeedback({
        status: "error",
        message: "An unexpected error occurred. Please try again.",
      });
    }
    if (user) {
      login(user);
      setFeedback({
        status: "success",
        message: "Signed in successfully.",
      });
      setOpen(false);
    }
  });

  return (
    <Dialog.Body>
      <form onSubmit={onSubmit}>
        <Field.Root id={"email"} invalid={!!errors.email}>
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

        <Field.Root id={"password"} marginTop={4} invalid={!!errors.password}>
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
          <Button
            variant="solid"
            flex={1}
            type="submit"
            colorPalette={"green"}
            loading={isSubmitting}
          >
            Sign In
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
