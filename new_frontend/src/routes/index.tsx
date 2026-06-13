import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/useTheme";
import { Moon, Sun } from "lucide-react";
import { toast } from "@/hooks/useToast";

export const Route = createFileRoute("/")({
  component: IndexComponent,
});

function IndexComponent() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const showToast = () => {
    toast.success("Components are working!", {
      description: "All UI components have been successfully installed.",
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">NATS Tower</h1>
          <p className="text-muted-foreground text-lg">
            Welcome to the new frontend
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Built with React, Vite, TanStack Router, TanStack Query, and
            shadcn/ui
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>UI Components Demo</CardTitle>
            <CardDescription>
              Testing the installed shadcn/ui components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-center flex-wrap">
              <Button onClick={showToast}>Show Toast</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-input">Test Input</Label>
              <Input id="test-input" placeholder="Type something..." />
            </div>

            <div>
              <Button
                onClick={toggleTheme}
                variant="outline"
                className="w-full"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="mr-2 h-4 w-4" />
                    Switch to Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="mr-2 h-4 w-4" />
                    Switch to Dark Mode
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
