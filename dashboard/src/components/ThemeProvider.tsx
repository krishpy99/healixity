import { useState, useEffect, createContext, useContext } from "react";

type Theme = "light" | "dark";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  
  // Load theme from localStorage after component has mounted
  useEffect(() => {
    const savedTheme = getSavedTheme(storageKey);
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, [storageKey]);

  // Apply theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove the class if it exists
    root.classList.remove("light", "dark");
    
      root.classList.add(theme);
      root.style.colorScheme = theme;
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      setTheme(theme);
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, theme);
      }
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// Helper function to safely get theme from localStorage
function getSavedTheme(storageKey: string): Theme | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const value = localStorage.getItem(storageKey) as Theme;
    return value || null;
  } catch (error) {
    console.warn('Failed to get theme from localStorage', error);
    return null;
  }
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  
  return context;
}; 