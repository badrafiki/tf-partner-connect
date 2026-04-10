import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import tfLogo from "@/assets/tf-usa-logo.svg";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = "404 — Page Not Found | TF USA";
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    return () => {
      document.title = "TF USA Partner Portal";
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="w-full max-w-[480px] text-center">
        <img src={tfLogo} alt="Total Filtration USA" className="h-10 mx-auto mb-8" />
        <p className="text-[80px] font-bold leading-none text-primary">404</p>
        <h1 className="text-[24px] font-medium text-primary mt-4">Page not found</h1>
        <p className="text-[15px] text-[#6B7280] leading-relaxed mt-2">
          The page you're looking for doesn't exist or you may not have access.
        </p>
        <div className="h-px bg-[#E5E7EB] my-8" />
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link to="/portal/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/5">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
        <p className="text-[13px] text-[#6B7280] mt-8">
          Need help? Contact{" "}
          <a href="mailto:partners@total-filtration.com" className="text-primary hover:underline">
            partners@total-filtration.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
