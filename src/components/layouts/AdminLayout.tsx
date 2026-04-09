import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  ClipboardList,
  Users,
  Package,
  MessageSquare,
  FileText,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const adminLinks = [
  { to: "/admin/applications", label: "Applications", icon: ClipboardList },
  { to: "/admin/distributors", label: "Distributors", icon: Users },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/enquiries", label: "Enquiries", icon: MessageSquare },
  { to: "/admin/quotations", label: "Quotations", icon: FileText },
];

const sidebarLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-foreground hover:bg-muted"
  }`;

function SidebarNav({ onNav }: { onNav?: () => void }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b">
        <span className="text-lg font-bold text-primary">TF USA</span>
        <span className="ml-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Admin
        </span>
      </div>
      <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
        {adminLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onNav}
            className={sidebarLinkClass}
          >
            <link.icon className="h-4 w-4 shrink-0" />
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 pb-4">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-destructive hover:bg-muted w-full"
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
      <aside className="hidden md:flex w-60 flex-col border-r border-l-4 border-l-primary bg-card shrink-0">
        <SidebarNav />
      </aside>

      {/* Mobile header + drawer */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center h-14 px-4 border-b bg-card">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
              <SidebarNav onNav={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="ml-3 text-lg font-bold text-primary">TF USA</span>
          <span className="ml-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
