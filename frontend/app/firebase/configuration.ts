import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.FIREBASE_API_KEY as string,
  authDomain: env.FIREBASE_AUTH_DOMAIN as string,
  projectId: env.FIREBASE_PROJECT_ID as string,
  storageBucket: env.FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID as string,
  appId: env.FIREBASE_APP_ID as string,
  measurementId: env.FIREBASE_MEASUREMENT_ID as string,
};
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export default app;
export const auth = getAuth(app);
