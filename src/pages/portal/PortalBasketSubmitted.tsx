import { CheckCircle } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PortalBasketSubmitted() {
  const location = useLocation();
  const enquiryId = (location.state as any)?.enquiryId as string | undefined;

  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="text-center max-w-md space-y-4">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold text-foreground">Enquiry submitted</h2>
        <p className="text-muted-foreground">
          Thank you — your enquiry has been received. Our team will review it and
          respond with a formal quotation within 1–2 business days.
        </p>
        {enquiryId && (
          <p className="text-sm text-muted-foreground">
            Reference: <span className="font-mono font-medium text-foreground">{enquiryId.slice(0, 8)}</span>
          </p>
        )}
        <div className="flex gap-3 justify-center pt-4">
          <Button asChild variant="outline">
            <Link to="/portal/products">Submit another enquiry</Link>
          </Button>
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link to="/portal/quotations">View my quotations</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
