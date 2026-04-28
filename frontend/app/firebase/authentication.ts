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
        await updateProfile(firebaseUser, { displayName: username }).catch(
          (error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            throw new Error(
              `Error updating user profile: ${errorCode} - ${errorMessage}`,
            );
          },
        );
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
  var accessToken: string = "";
  googleProvider.setCustomParameters({
    access_type: "offline",
    prompt: "select_account",
  });
  await signInWithPopup(auth, googleProvider)
    .then((result) => {
      firabaseUser = result.user;
      accessToken =
        GoogleAuthProvider.credentialFromResult(result)?.accessToken || "";
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      throw new Error(
        `Error logging in with Google: ${errorCode} - ${errorMessage}`,
      );
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
    });
  return new AppUser(user);
};
