import type { AppUser } from "app/models/AppUser";
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
}
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const userInit: AppUser | null = JSON.parse(
    localStorage.getItem("user") || "null",
  );
  const [user, setUser] = useState<AppUser | null>(userInit || null);
  // Simulate loading user data from local storage or an API on mount
  useEffect(() => {
    const loadUserData = async () => {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    };
    loadUserData();
  }, []);

  // Function to handle user login
  const login = (userData: AppUser) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData)); // Persist user data in local storage
  };

  // Function to handle user logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user"); // Remove user data from local storage
  };

  // Context value to pass down to components
  const authContextValue: AuthContextType = {
    user,
    setUser,
    login,
    logout,
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
