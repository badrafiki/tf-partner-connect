import { Link } from "react-router-dom";
import tfLogo from "@/assets/tf-usa-logo.svg";

export function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <header className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-[760px] mx-auto flex items-center justify-between">
          <Link to="/login">
            <img src={tfLogo} alt="Total Filtration USA" className="h-10" />
          </Link>
          <Link to="/login" className="text-sm font-medium text-[#1B3A6B] hover:underline">
            Back to portal →
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-[760px] w-full mx-auto px-6 py-10">
        {children}
      </main>

      <footer className="border-t border-gray-200 bg-white py-6 px-6">
        <div className="max-w-[760px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <Link to="/login" className="font-medium text-[#1B3A6B] hover:underline">
            Back to portal →
          </Link>
          <span>© {new Date().getFullYear()} Total Filtration USA LLC. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
