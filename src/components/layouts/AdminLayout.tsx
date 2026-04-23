import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  Users,
  Package,
  ShoppingCart,
  FileCheck,
  Zap,
  LogOut,
  Menu,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import tfLogo from "@/assets/tf-usa-logo.svg";

const adminLinks = [
  { to: "/admin/applications", label: "Applications", icon: FileText },
  { to: "/admin/distributors", label: "Distributors", icon: Users },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/enquiries", label: "Enquiries", icon: ShoppingCart },
  { to: "/admin/quotations", label: "Quotations", icon: FileCheck },
  { to: "/admin/erp-sync", label: "ERP Sync", icon: Zap },
  { to: "/admin/emails", label: "Emails", icon: Mail },
];

function SidebarNav({ onNav }: { onNav?: () => void }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["admin-pending-apps-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return count || 0;
    },
    refetchInterval: 60000,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo + Admin label */}
      <div className="px-5 py-5 border-b border-border">
        <img src={tfLogo} alt="Total Filtration USA" className="h-8 mb-2" />
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
          Admin Panel
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4">
        {adminLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onNav}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors relative ${
                isActive
                  ? "bg-primary text-primary-foreground before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:bg-accent before:rounded-r"
                  : "text-muted-foreground hover:bg-tf-navy-light hover:text-primary"
              }`
            }
          >
            <link.icon className="h-[18px] w-[18px] shrink-0" />
            {link.label}
            {link.label === "Applications" && pendingCount > 0 && (
              <span className="ml-auto bg-accent text-accent-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-4 pb-4 border-t border-border pt-3 space-y-2">
        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-card shrink-0">
        <SidebarNav />
      </aside>

      {/* Mobile header + drawer */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center h-14 px-4 border-b border-border bg-card">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
              <SidebarNav onNav={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <img src={tfLogo} alt="TF USA" className="h-7 ml-3" />
          <span className="ml-2 text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
            Admin
          </span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
