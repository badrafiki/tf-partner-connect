import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import tfLogo from "@/assets/tf-usa-logo.svg";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type State =
  | { phase: "validating" }
  | { phase: "ready" }
  | { phase: "already" }
  | { phase: "invalid" }
  | { phase: "submitting" }
  | { phase: "done" }
  | { phase: "error"; message: string };

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>({ phase: "validating" });

  useEffect(() => {
    if (!token) {
      setState({ phase: "invalid" });
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } },
        );
        const json = await res.json();
        if (!res.ok) {
          setState({ phase: "invalid" });
          return;
        }
        if (json.valid === false && json.reason === "already_unsubscribed") {
          setState({ phase: "already" });
        } else if (json.valid) {
          setState({ phase: "ready" });
        } else {
          setState({ phase: "invalid" });
        }
      } catch {
        setState({ phase: "error", message: "Could not validate this link. Please try again later." });
      }
    })();
  }, [token]);

  const handleConfirm = async () => {
    setState({ phase: "submitting" });
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (json.success || json.reason === "already_unsubscribed") {
        setState({ phase: "done" });
      } else {
        setState({ phase: "error", message: json.error || "Failed to unsubscribe." });
      }
    } catch {
      setState({ phase: "error", message: "Network error. Please try again." });
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center space-y-5">
        <img src={tfLogo} alt="Total Filtration USA" className="h-10 mx-auto" />

        {state.phase === "validating" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Validating your link…</p>
          </>
        )}

        {state.phase === "ready" && (
          <>
            <h1 className="text-xl font-semibold text-primary">Unsubscribe from emails</h1>
            <p className="text-sm text-muted-foreground">
              Click below to stop receiving non-essential emails from the TF USA Partner Portal.
              Critical account and order notifications will still be sent.
            </p>
            <Button onClick={handleConfirm} className="w-full">Confirm unsubscribe</Button>
          </>
        )}

        {state.phase === "submitting" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Processing…</p>
          </>
        )}

        {state.phase === "done" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
            <h1 className="text-xl font-semibold text-primary">You're unsubscribed</h1>
            <p className="text-sm text-muted-foreground">You won't receive non-essential emails from us anymore.</p>
          </>
        )}

        {state.phase === "already" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
            <h1 className="text-xl font-semibold text-primary">Already unsubscribed</h1>
            <p className="text-sm text-muted-foreground">This email address is already opted out.</p>
          </>
        )}

        {state.phase === "invalid" && (
          <>
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold">Invalid link</h1>
            <p className="text-sm text-muted-foreground">This unsubscribe link is invalid or has expired.</p>
          </>
        )}

        {state.phase === "error" && (
          <>
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">{state.message}</p>
          </>
        )}
      </Card>
    </div>
  );
}
