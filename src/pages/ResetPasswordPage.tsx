import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import tfLogo from "@/assets/tf-usa-logo.svg";

export default function ResetPasswordPage() {
  const { resetPassword, updatePassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await resetPassword(email);
      toast({ title: "Check your email", description: "We've sent you a password reset link." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "Passwords do not match." });
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(newPassword);
      toast({ title: "Password updated", description: "You can now sign in with your new password." });
      navigate("/login");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-tf-grey-bg">
      {/* Header */}
      <header className="bg-tf-navy h-[60px] flex items-center px-8">
        <Link to="/login">
          <img src={tfLogo} alt="TF USA" className="h-8 brightness-0 invert" />
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">
          <div className="bg-white rounded-lg border border-tf-grey-border shadow-sm p-8">
            <div className="text-center mb-8">
              <p className="text-[11px] uppercase tracking-[0.08em] text-tf-text-secondary font-medium mb-6">
                {isRecovery ? "SET NEW PASSWORD" : "RESET YOUR PASSWORD"}
              </p>
              <p className="text-sm text-tf-text-secondary">
                {isRecovery
                  ? "Enter your new password below."
                  : "Enter your email and we'll send you a reset link."}
              </p>
            </div>

            {isRecovery ? (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-tf-text-primary text-sm">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="h-11 border-tf-grey-border focus:border-tf-navy focus:ring-tf-navy"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-tf-text-primary text-sm">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="h-11 border-tf-grey-border focus:border-tf-navy focus:ring-tf-navy"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-tf-navy hover:bg-tf-navy-dark text-white font-medium"
                  disabled={submitting}
                >
                  {submitting ? "Updating…" : "Update Password"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-tf-text-primary text-sm">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 border-tf-grey-border focus:border-tf-navy focus:ring-tf-navy"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-tf-navy hover:bg-tf-navy-dark text-white font-medium"
                  disabled={submitting}
                >
                  {submitting ? "Sending…" : "Send Reset Link"}
                </Button>
              </form>
            )}

            <div className="text-center mt-6">
              <Link to="/login" className="text-sm text-tf-text-secondary hover:text-tf-navy">
                ← Back to sign in
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-tf-text-secondary/60 mt-6">
            © 2026 Total Filtration USA LLC
          </p>
        </div>
      </div>
    </div>
  );
}
