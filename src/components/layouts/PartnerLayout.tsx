import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBasket } from "@/contexts/BasketContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Menu, ShoppingCart, User, LogOut, ChevronDown, Tag, Package, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import tfLogo from "@/assets/tf-usa-logo.svg";

const navLinks = [
  { to: "/portal/dashboard", label: "Dashboard" },
  { to: "/portal/products", label: "Products" },
  { to: "/portal/basket", label: "Basket" },
  { to: "/portal/quotations", label: "Quotations" },
  { to: "/portal/orders", label: "Orders" },
  { to: "/portal/enquiries", label: "History" },
  { to: "/portal/account", label: "Account" },
];

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const notifIcons: Record<string, { icon: typeof Bell; color: string }> = {
  price_change: { icon: Tag, color: "text-amber-500" },
  stock_update: { icon: Package, color: "text-blue-500" },
  quotation_issued: { icon: FileText, color: "text-green-500" },
  general: { icon: Bell, color: "text-muted-foreground" },
};

export function PartnerLayout() {
  const { companyName, partnerId, signOut } = useAuth();
  const { itemCount } = useBasket();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  const { data: unreadNotifs = [] } = useQuery({
    queryKey: ["partner-notifications-unread", partnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("partner_id", partnerId!)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!partnerId,
    refetchInterval: 60000,
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("notifications").update({ read: true }).eq("partner_id", partnerId!).eq("read", false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-notifications-unread"] });
      queryClient.invalidateQueries({ queryKey: ["partner-notifications"] });
    },
  });

  const unreadCount = unreadNotifs.length;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = (companyName || "P").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Nav */}
      <header className="bg-primary shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo + divider + company */}
            <div className="flex items-center">
              <Link to="/portal/dashboard" className="flex items-center shrink-0">
                <img
                  src={tfLogo}
                  alt="Total Filtration USA"
                  className="h-9 brightness-0 invert"
                />
              </Link>
              <div className="hidden sm:block w-px h-6 bg-white/20 mx-4" />
              {companyName && (
                <span className="hidden sm:block text-sm font-medium text-white max-w-[200px] truncate">
                  {companyName}
                </span>
              )}
            </div>

            {/* Centre: Nav links (desktop) */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `relative px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent"
                        : "text-white/70 hover:text-white"
                    }`
                  }
                >
                  {link.label === "Basket" ? (
                    <span className="flex items-center gap-1 relative">
                      {link.label}
                      {itemCount > 0 && (
                        <span className="absolute -top-2 -right-4 bg-accent text-accent-foreground text-[10px] font-bold rounded-full h-[18px] w-[18px] flex items-center justify-center">
                          {itemCount}
                        </span>
                      )}
                    </span>
                  ) : (
                    link.label
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Right: Bell + account */}
            <div className="flex items-center gap-1">
              {/* Notification Bell */}
              <Popover open={bellOpen} onOpenChange={setBellOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10 relative" aria-label="View notifications">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full h-[18px] min-w-[18px] px-1 flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="p-3 border-b flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Notifications</p>
                  </div>
                  {unreadNotifs.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">All caught up!</p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {unreadNotifs.map((n) => {
                        const cfg = notifIcons[n.type] || notifIcons.general;
                        const Icon = cfg.icon;
                        return (
                          <div key={n.id} className="flex items-start gap-2 px-3 py-2.5 border-b last:border-0 hover:bg-muted/50">
                            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm leading-snug">{n.message}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{relativeTime(n.created_at || "")}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="p-2 border-t flex justify-between items-center">
                    {unreadCount > 0 && (
                      <button onClick={() => { markAllReadMutation.mutate(); setBellOpen(false); }} className="text-xs text-muted-foreground hover:text-foreground">
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => { setBellOpen(false); navigate("/portal/dashboard"); }}
                      className="text-xs text-primary hover:underline ml-auto"
                    >
                      View all →
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="hidden lg:block w-px h-6 bg-white/20 mx-2" />

              {/* Account dropdown (desktop) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden lg:flex text-white/70 hover:text-white hover:bg-white/10 gap-2 px-2" aria-label="Account menu">
                    <span className="flex items-center justify-center h-7 w-7 rounded-full bg-white/20 text-white text-xs font-bold">
                      {initials}
                    </span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/portal/account")}>
                    <User className="h-4 w-4 mr-2" /> My Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile hamburger */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden text-white/70 hover:text-white hover:bg-white/10" aria-label="Open navigation menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 bg-primary border-none p-0">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <div className="p-5 flex items-center justify-between">
                    <img src={tfLogo} alt="TF USA" className="h-8 brightness-0 invert" />
                    <button onClick={() => setMobileOpen(false)} className="text-white/60 hover:text-white">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <nav className="flex flex-col px-3 mt-2">
                    {navLinks.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                            isActive ? "bg-white/15 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
                          }`
                        }
                      >
                        {link.label}
                      </NavLink>
                    ))}
                    <div className="border-t border-white/10 mt-4 pt-4 mx-4">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white w-full"
                      >
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 bg-tf-grey-bg">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Column 1 — Brand */}
            <div>
              <img src={tfLogo} alt="Total Filtration USA" className="h-7 mb-3" />
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Industrial Air & Coolant Filtration For U.S. Businesses
              </p>
              <p className="text-xs text-muted-foreground/60 mt-4">
                © {new Date().getFullYear()} Total Filtration USA LLC. All rights reserved.
              </p>
            </div>

            {/* Column 2 — Contact */}
            <div>
              <p className="text-[13px] font-medium text-primary uppercase tracking-wider mb-3">Get in touch</p>
              <div className="space-y-1 text-[13px] text-muted-foreground">
                <p>14422 Shoreside Way, Suite 110 #132</p>
                <p>Winter Garden, Florida 34787</p>
                <p>+1-407-842-0818</p>
                <a href="mailto:partners@total-filtration.com" className="text-primary hover:underline block">
                  partners@total-filtration.com
                </a>
              </div>
            </div>

            {/* Column 3 — Links */}
            <div>
              <p className="text-[13px] font-medium text-primary uppercase tracking-wider mb-3">Portal</p>
              <div className="space-y-1.5 text-[13px]">
                <Link to="/privacy" className="block text-muted-foreground hover:text-primary">Privacy Policy</Link>
                <Link to="/terms" className="block text-muted-foreground hover:text-primary">Terms & Conditions</Link>
                <Link to="/cookies" className="block text-muted-foreground hover:text-primary">Cookie Policy</Link>
                <a href="https://total-filtration.com" target="_blank" rel="noopener noreferrer" className="block text-muted-foreground hover:text-primary">
                  total-filtration.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
