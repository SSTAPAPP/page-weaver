import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useRealtimeSync } from "@/hooks/useCloudData";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Route-level lazy loading to reduce initial bundle size
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Members = lazy(() => import("./pages/Members"));
const Cashier = lazy(() => import("./pages/Cashier"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Services = lazy(() => import("./pages/Services"));
const Reports = lazy(() => import("./pages/Reports"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Settings = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtimeSync(true);
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <RealtimeProvider>
                    <MainLayout>
                      <Suspense fallback={<PageFallback />}>
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/members" element={<Members />} />
                          <Route path="/cashier" element={<Cashier />} />
                          <Route path="/appointments" element={<Appointments />} />
                          <Route path="/services" element={<Services />} />
                          <Route path="/reports" element={<Reports />} />
                          <Route path="/transactions" element={<Transactions />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </MainLayout>
                  </RealtimeProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
