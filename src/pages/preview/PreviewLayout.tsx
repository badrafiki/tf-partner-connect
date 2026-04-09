import { Outlet, Link } from "react-router-dom";
import { ConceptSwitcher } from "@/components/preview/ConceptSwitcher";

export default function PreviewLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Simplified partner header */}
      <header className="bg-[#1B3A6B] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/preview/catalog-1" className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight">TF USA</span>
              <span className="hidden sm:inline text-sm font-light text-white/70">| Demo Partner Co.</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {["Dashboard", "Products", "Basket", "Quotations"].map((l) => (
                <span
                  key={l}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    l === "Products" ? "bg-white/20 text-white" : "text-white/80"
                  }`}
                >
                  {l}
                </span>
              ))}
            </nav>
            <div className="text-sm text-white/60">Preview Mode</div>
          </div>
        </div>
      </header>

      <Outlet />
      <ConceptSwitcher />
    </div>
  );
}
