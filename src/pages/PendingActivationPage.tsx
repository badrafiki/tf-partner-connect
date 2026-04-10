import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function PendingActivationPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary px-4">
      <div className="text-center max-w-md">
        <div className="text-4xl font-bold text-primary-foreground tracking-tight mb-2">
          TF USA
        </div>
        <div className="text-primary-foreground/70 text-sm font-medium mb-8">
          Partner Portal
        </div>
        <div className="bg-white/10 backdrop-blur rounded-lg p-8">
          <h1 className="text-xl font-semibold text-primary-foreground mb-3">
            Account Pending Activation
          </h1>
          <p className="text-primary-foreground/80 text-sm leading-relaxed mb-6">
            Your account is pending activation. You'll receive an email once your
            application has been reviewed.
          </p>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="border-white/30 text-primary-foreground hover:bg-white/10"
          >
            Sign Out
          </Button>
        </div>
        <div className="mt-6 flex gap-3 justify-center text-xs text-primary-foreground/50">
          <a href="/privacy" className="hover:text-primary-foreground/80 underline">Privacy Policy</a>
          <span>·</span>
          <a href="/terms" className="hover:text-primary-foreground/80 underline">Terms & Conditions</a>
        </div>
      </div>
    </div>
  );
}
