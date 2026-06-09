import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const lightTheme = {
  background: "#F5F7FA",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  cardAlt: "#EEF2F7",
  primary: "#00A87E",
  primaryDark: "#008B6A",
  primaryLight: "#33D4A8",
  accent: "#2563EB",
  accentDark: "#1D4ED8",
  danger: "#DC2626",
  warning: "#D97706",
  success: "#059669",
  info: "#2563EB",
  textPrimary: "#1F2937",
  textSecondary: "#4B5563",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  borderLight: "#D1D5DB",
  chart: [
    "#00A87E",
    "#2563EB",
    "#D97706",
    "#DC2626",
    "#7C3AED",
    "#DB2777",
    "#059669",
    "#3B82F6",
  ],
};

export const darkTheme = {
  background: "#0F1923",
  surface: "#1A2635",
  card: "#1E2E40",
  cardAlt: "#243447",
  primary: "#00C896",
  primaryDark: "#00A87E",
  primaryLight: "#33D4A8",
  accent: "#3D8EFF",
  accentDark: "#2B6FCC",
  danger: "#FF4D6A",
  warning: "#FFB830",
  success: "#00C896",
  info: "#3D8EFF",
  textPrimary: "#F0F4F8",
  textSecondary: "#8A9BB0",
  textMuted: "#4A5F75",
  border: "#243447",
  borderLight: "#2E4057",
  chart: [
    "#00C896",
    "#3D8EFF",
    "#FFB830",
    "#FF4D6A",
    "#A78BFA",
    "#F472B6",
    "#34D399",
    "#60A5FA",
  ],
};

type Theme = typeof lightTheme;

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("@cfo_theme_dark").then((value) => {
      if (value !== null) {
        setIsDark(value === "true");
      }
    });
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    AsyncStorage.setItem("@cfo_theme_dark", String(newIsDark));
  };

  const setTheme = (dark: boolean) => {
    setIsDark(dark);
    AsyncStorage.setItem("@cfo_theme_dark", String(dark));
  };

  const value = useMemo(() => ({
    theme: isDark ? darkTheme : lightTheme,
    isDark,
    toggleTheme,
    setTheme,
  }), [isDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

// Hook para obtener colores del tema actual
export const useColors = () => {
  const { theme } = useTheme();
  return theme;
};
