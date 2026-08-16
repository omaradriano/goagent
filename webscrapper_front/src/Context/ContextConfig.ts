import { createContext } from "react";
import type { AlertOptions } from "../customHooks/useModalAlert";
import type { session_claims } from "../Types/types";

export type PreferedScheme = "Light" | "Dark";
export const ThemeContext = createContext<{
  theme: string;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
} | null>(null);

export type UserMode = "Asegurador" | "Admin" | "Demo";
export const UserModeContext = createContext<UserMode | null>(null);

export const AlertContext = createContext<{
  alertOptions: AlertOptions;
  setAlertOptions: React.Dispatch<React.SetStateAction<AlertOptions>>;
  showAlert: boolean;
  setShowAlert: React.Dispatch<React.SetStateAction<boolean>>;
} | null>(null);

export const AuthContext = createContext<{
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  session: session_claims | null;
  setSession: React.Dispatch<React.SetStateAction<session_claims | null>>;
} | null>(null);

export const DataChangedContext = createContext<{
  dataHasChanged: number,
  setDataHasChanged: React.Dispatch<React.SetStateAction<number>>;
} | null>(null)

export const SubscriptionContext = createContext<{
  isSubscribed: boolean;
  setIsSubscribed: React.Dispatch<React.SetStateAction<boolean>>;
  periodEnd: string | null;
  setPeriodEnd: React.Dispatch<React.SetStateAction<string | null>>;
} | null>(null)
