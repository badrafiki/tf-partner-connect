import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBasket } from "@/contexts/BasketContext";
import { Bell, Menu, ShoppingCart, User, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { to: "/portal/dashboard", label: "Dashboard" },
  { to: "/portal/products", label: "Products" },
  { to: "/portal/basket", label: "Basket" },
  { to: "/portal/quotations", label: "Quotations" },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? "bg-white/20 text-white" : "text-white/80 hover:text-white hover:bg-white/10"
  }`;

export function PartnerLayout() {
  const { companyName, signOut } = useAuth();
  const { itemCount } = useBasket();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Nav */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo + company */}
            <div className="flex items-center gap-4">
              <Link to="/portal/dashboard" className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight">TF USA</span>
                {companyName && (
                  <span className="hidden sm:inline text-sm font-light text-white/70">
                    | {companyName}
                  </span>
                )}
              </Link>
            </div>

            {/* Centre: Nav links (desktop) */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={linkClass}>
                  {link.label === "Basket" ? (
                    <span className="flex items-center gap-1">
                      <ShoppingCart className="h-4 w-4" />
                      {link.label}
                      {itemCount > 0 && (
                        <Badge className="bg-accent text-accent-foreground text-xs px-1.5 py-0 ml-1">
                          {itemCount}
                        </Badge>
                      )}
                    </span>
                  ) : (
                    link.label
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Right: Bell + account */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-white/10 relative">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs px-1 py-0 min-w-[18px] h-[18px] flex items-center justify-center">
                  0
                </Badge>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden md:flex text-white/80 hover:text-white hover:bg-white/10 gap-1">
                    <User className="h-4 w-4" />
                    <span className="text-sm">{companyName || "Account"}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/portal/account")}>
                    <User className="h-4 w-4 mr-2" /> Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile hamburger */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden text-white/80 hover:text-white hover:bg-white/10">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <SheetTitle className="text-lg font-bold text-primary mb-4">TF USA</SheetTitle>
                  <nav className="flex flex-col gap-2">
                    {navLinks.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `px-3 py-2 rounded-md text-sm font-medium ${
                            isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                          }`
                        }
                      >
                        {link.label}
                      </NavLink>
                    ))}
                    <NavLink
                      to="/portal/account"
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `px-3 py-2 rounded-md text-sm font-medium ${
                          isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                        }`
                      }
                    >
                      Account
                    </NavLink>
                    <button
                      onClick={handleSignOut}
                      className="px-3 py-2 rounded-md text-sm font-medium text-left text-destructive hover:bg-muted"
                    >
                      Sign Out
                    </button>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
