import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const env = import.meta.env;

const getRequiredEnv = (key: string): string => {
  const value = env[key as keyof ImportMetaEnv];
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing Firebase environment variable: ${key}`);
  }
  return value;
};

const firebaseConfig = {
  apiKey: getRequiredEnv("FIREBASE_API_KEY"),
  authDomain: getRequiredEnv("FIREBASE_AUTH_DOMAIN"),
  projectId: getRequiredEnv("FIREBASE_PROJECT_ID"),
  storageBucket: getRequiredEnv("FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getRequiredEnv("FIREBASE_MESSAGING_SENDER_ID"),
  appId: getRequiredEnv("FIREBASE_APP_ID"),
  measurementId: getRequiredEnv("FIREBASE_MEASUREMENT_ID"),
};
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export default app;
export const auth = getAuth(app);
