import type { AppUser } from "app/models/AppUser";
import { AppUser as AppUserClass } from "app/models/AppUser";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "app/firebase/configuration";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type FC,
  type ProviderProps,
} from "react";

interface Props {}
interface AuthContextType {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  login: (userData: AppUser) => void;
  logout: () => void;
  isLoading: boolean;
}
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Recreate AppUser instance from Firebase user
        setUser(new AppUserClass(firebaseUser));
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Function to handle user login
  const login = (userData: AppUser) => {
    setUser(userData);
    // No need to store in localStorage - Firebase handles persistence
  };

  // Function to handle user logout
  const logout = () => {
    setUser(null);
    // Firebase auth state will trigger onAuthStateChanged callback
  };

  // Context value to pass down to components
  const authContextValue: AuthContextType = {
    user,
    setUser,
    login,
    logout,
    isLoading,
  };

  //(property) React.ProviderProps<null>.value: null
  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
