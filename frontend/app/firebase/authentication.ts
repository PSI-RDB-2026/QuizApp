import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { auth } from "./configuration";
import { AppUser } from "app/models/AppUser";
import { postLogin, postRegister } from "api/api";

const googleProvider = new GoogleAuthProvider();

export const registerUser = async (
  email: string,
  password: string,
  username: string,
) => {
  var firebaseUser: any = null;
  await createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      firebaseUser = userCredential.user;
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      throw new Error(`Error registering user: ${errorCode} - ${errorMessage}`);
    })
    .finally(async () => {
      if (firebaseUser) {
        const appUser = new AppUser(firebaseUser);
        await updateProfile(firebaseUser, { displayName: username }).catch(
          (error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            throw new Error(
              `Error updating user profile: ${errorCode} - ${errorMessage}`,
            );
          },
        );
        await postRegister({
          username,
          access_token: await appUser.getAccessToken(),
        }).catch((error) => {
          const errorMessage =
            "Error registering user in backend: " +
            ("message" in error ? error.message : "Unknown error");
          throw new Error(errorMessage);
        });
        await sendEmailVerification(firebaseUser).catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          throw new Error(
            `Error sending email verification: ${errorCode} - ${errorMessage}`,
          );
        });
      }
    });
  console.log("Registered user:", firebaseUser);
  return new AppUser(firebaseUser);
};

export const googleLogin = async () => {
  var firabaseUser: any = null;
  googleProvider.setCustomParameters({
    access_type: "offline",
    prompt: "select_account",
  });
  await signInWithPopup(auth, googleProvider)
    .then((result) => {
      firabaseUser = result.user;
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      throw new Error(
        `Error logging in with Google: ${errorCode} - ${errorMessage}`,
      );
    })
    .finally(async () => {
      if (firabaseUser) {
        const appUser = new AppUser(firabaseUser);
        await postLogin({
          username: firabaseUser.displayName || "Google User",
          access_token: await appUser.getAccessToken(),
        }).catch((error) => {
          const errorMessage =
            "Error registering user in backend: " +
            ("message" in error ? error.message : "Unknown error");
          throw new Error(errorMessage);
        });
      }
    });
  return new AppUser(firabaseUser);
};

export const loginUser = async (email: string, password: string) => {
  var user: any = null;
  await signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      user = userCredential.user;
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      throw new Error(`Error logging in: ${errorCode} - ${errorMessage}`);
    })
    .finally(async () => {
      if (user) {
        const appUser = new AppUser(user);
        await postLogin({
          username: user.displayName || "Email User",
          access_token: await appUser.getAccessToken(),
        }).catch((error) => {
          const errorMessage =
            "Error registering user in backend: " +
            ("message" in error ? error.message : "Unknown error");
          throw new Error(errorMessage);
        });
      }
    });
  return new AppUser(user);
};
