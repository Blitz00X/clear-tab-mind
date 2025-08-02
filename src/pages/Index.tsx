import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

/**
 * Landing page shown at the root of the application.
 * Serves as a placeholder until customized.
 *
 * @returns Basic welcome screen JSX.
 */
const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">ZeroTab</h1>
        <p className="text-xl text-muted-foreground max-w-md mx-auto">
          Lightweight AI-enhanced browser decluttering tool to save and organize your tabs.
        </p>
        <Button onClick={() => navigate("/auth")}>Get Started</Button>
      </div>
    </div>
  );
};

export default Index;
