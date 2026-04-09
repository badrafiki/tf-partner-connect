import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: "admin" | "partner" | null;
  partnerId: string | null;
  discountPercentage: number;
  companyName: string | null;
  contactName: string | null;
  tierLabel: string | null;
  assignedRep: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    partnerId: null,
    discountPercentage: 0,
    companyName: null,
    loading: true,
  });

  const loadUserData = async (user: User) => {
    // Load role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const role = (roleData?.role as "admin" | "partner") ?? null;

    let partnerId: string | null = null;
    let discountPercentage = 0;
    let companyName: string | null = null;

    if (role === "partner") {
      const { data: partnerData } = await supabase
        .from("partners")
        .select("id, discount_percentage, company_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (partnerData) {
        partnerId = partnerData.id;
        discountPercentage = Number(partnerData.discount_percentage) || 0;
        companyName = partnerData.company_name;
      }
    }

    return { role, partnerId, discountPercentage, companyName };
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Use setTimeout to avoid potential Supabase deadlock
          setTimeout(async () => {
            const userData = await loadUserData(session.user);
            setState({
              user: session.user,
              session,
              ...userData,
              loading: false,
            });
          }, 0);
        } else {
          setState({
            user: null,
            session: null,
            role: null,
            partnerId: null,
            discountPercentage: 0,
            companyName: null,
            loading: false,
          });
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const userData = await loadUserData(session.user);
        setState({
          user: session.user,
          session,
          ...userData,
          loading: false,
        });
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
