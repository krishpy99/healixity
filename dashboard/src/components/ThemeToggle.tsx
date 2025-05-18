import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => {
        if (theme === "light") setTheme("dark");
        else setTheme("light");
      }}
      className="w-9 px-0"
    >
      {theme === "light" && <Sun className="h-4 w-4 text-foreground" />}
      {theme === "dark" && <Moon className="h-4 w-4 text-foreground" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
} 