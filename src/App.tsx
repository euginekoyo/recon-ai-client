import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Index from "./pages/Index";
import AccessControl from "./pages/AccessControl";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/access-control" element={
            <DashboardLayout>
              <AccessControl />
            </DashboardLayout>
          } />
          <Route path="/transactions" element={
            <DashboardLayout>
              <div className="p-6">
                <h1 className="text-3xl font-bold">Transactions</h1>
                <p className="text-muted-foreground mt-2">Transaction management coming soon...</p>
              </div>
            </DashboardLayout>
          } />
          <Route path="/reconciliation" element={
            <DashboardLayout>
              <div className="p-6">
                <h1 className="text-3xl font-bold">Reconciliation</h1>
                <p className="text-muted-foreground mt-2">Reconciliation tools coming soon...</p>
              </div>
            </DashboardLayout>
          } />
          <Route path="/settings" element={
            <DashboardLayout>
              <div className="p-6">
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground mt-2">System settings coming soon...</p>
              </div>
            </DashboardLayout>
          } />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
