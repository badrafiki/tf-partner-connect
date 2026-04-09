import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { BasketProvider } from "@/contexts/BasketContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PartnerLayout } from "@/components/layouts/PartnerLayout";
import { AdminLayout } from "@/components/layouts/AdminLayout";

import LoginPage from "@/pages/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ApplicationPage from "@/pages/ApplicationPage";
import PendingActivationPage from "@/pages/PendingActivationPage";

import PortalDashboard from "@/pages/portal/PortalDashboard";
import PortalProducts from "@/pages/portal/PortalProducts";
import PortalBasket from "@/pages/portal/PortalBasket";
import PortalBasketSubmitted from "@/pages/portal/PortalBasketSubmitted";
import PortalEnquiries from "@/pages/portal/PortalEnquiries";
import PortalQuotations from "@/pages/portal/PortalQuotations";
import PortalOrders from "@/pages/portal/PortalOrders";
import PortalAccount from "@/pages/portal/PortalAccount";

import AdminApplications from "@/pages/admin/AdminApplications";
import AdminDistributors from "@/pages/admin/AdminDistributors";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminEnquiries from "@/pages/admin/AdminEnquiries";
import AdminQuotations from "@/pages/admin/AdminQuotations";
import AdminErpSync from "@/pages/admin/AdminErpSync";

import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BasketProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/apply" element={<ApplicationPage />} />
            <Route path="/pending" element={<PendingActivationPage />} />

            {/* Partner Portal */}
            <Route
              path="/portal"
              element={
                <ProtectedRoute allowedRole="partner">
                  <PartnerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/portal/dashboard" replace />} />
              <Route path="dashboard" element={<PortalDashboard />} />
              <Route path="products" element={<PortalProducts />} />
              <Route path="basket" element={<PortalBasket />} />
              <Route path="basket/submitted" element={<PortalBasketSubmitted />} />
              <Route path="enquiries" element={<PortalEnquiries />} />
              <Route path="quotations" element={<PortalQuotations />} />
              <Route path="orders" element={<PortalOrders />} />
              <Route path="account" element={<PortalAccount />} />
            </Route>

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/applications" replace />} />
              <Route path="applications" element={<AdminApplications />} />
              <Route path="distributors" element={<AdminDistributors />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="enquiries" element={<AdminEnquiries />} />
              <Route path="quotations" element={<AdminQuotations />} />
              <Route path="erp-sync" element={<AdminErpSync />} />
            </Route>


            <Route path="*" element={<NotFound />} />
          </Routes>
          </BasketProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
