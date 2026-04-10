import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import tfLogo from "@/assets/tf-usa-logo.svg";

export default function LoginPage() {
  const { user, role, loading, signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (user && role === "admin") return <Navigate to="/admin" replace />;
  if (user && role === "partner") return <Navigate to="/portal" replace />;
  if (user && !role) return <Navigate to="/pending" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: err.message || "Invalid email or password.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel — navy brand */}
      <div className="lg:w-[45%] bg-primary flex flex-col items-center px-8 py-12 lg:py-0 relative lg:min-h-screen">
        <div className="flex-1 flex flex-col justify-center max-w-md w-full text-center lg:text-left">
          <img
            src={tfLogo}
            alt="Total Filtration USA"
            className="h-12 brightness-0 invert mx-auto lg:mx-0 mb-8"
          />
          <h1 className="text-[32px] font-semibold text-white leading-tight mb-4">
            Partner Portal
          </h1>
          <p className="text-white/70 text-base leading-relaxed">
            Exclusive access for authorised TF USA distribution partners.
          </p>
        </div>
        <p className="lg:absolute lg:bottom-6 lg:left-0 lg:right-0 text-center text-white/60 text-[13px] italic mt-8 lg:mt-0">
          Industrial Air & Coolant Filtration For U.S. Businesses
        </p>
      </div>

      {/* Right panel — white form */}
      <div className="lg:w-[55%] flex flex-col justify-center items-center px-6 min-h-screen" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="w-full max-w-[400px] mx-auto">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.08em] mb-8">
            Sign in to your account
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-foreground">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="text-right">
                <Link to="/reset-password" className="text-[13px] text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-8">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">New distributor?</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <p className="text-center">
            <Link to="/apply" className="text-sm font-medium text-primary hover:underline">
              Apply for a partner account →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
