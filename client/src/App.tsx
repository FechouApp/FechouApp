import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useFirebaseAuth";
import { AuthProvider } from "@/contexts/AuthProvider";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Quotes from "@/pages/quotes";
import NewQuote from "@/pages/new-quote";
import Reviews from "@/pages/reviews";
import Plans from "@/pages/plans";
import PlanComparison from "@/pages/plan-comparison";
import Settings from "@/pages/settings";
import QuoteView from "@/pages/quote-view";
import PublicQuote from "@/pages/public-quote";
import ReceiptView from "@/pages/receipt-view";
import PublicReceipt from "@/pages/public-receipt";
import PublicReceiptPDF from "@/pages/public-receipt-pdf";
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import LoadingSpinner from "@/components/common/loading-spinner";
import Reports from "@/pages/reports";
import SavedItemsPage from "@/pages/saved-items";
import ClientProfile from "@/pages/client-profile";
import AdminPanel from "@/pages/admin-dashboard";
import Welcome from "@/pages/welcome";
import ReferralsPage from "@/pages/referrals";
import InstallPrompt from "@/components/pwa/install-prompt";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if this is a public route (quote or receipt)
  const isPublicRoute = window.location.pathname.startsWith('/quote/') || 
                       window.location.pathname.startsWith('/receipt/');

  // Allow public access to quote and receipt pages
  if (!isAuthenticated && !isPublicRoute) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // If not authenticated but accessing public route, show only the public pages
  if (!isAuthenticated && isPublicRoute) {
    return (
      <Switch>
        <Route path="/quote/:quoteNumber" component={PublicQuote} />
        <Route path="/receipt/:quoteNumber" component={PublicReceipt} />
        <Route path="/receipt/:quoteNumber/pdf" component={PublicReceiptPDF} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Check if user needs onboarding
  const hasCompletedOnboarding = localStorage.getItem('fechou_onboarding_completed');

  // Show onboarding for new users
  if (!hasCompletedOnboarding) {
    return <Welcome />;
  }

  return (
    <Switch>
      {/* Public routes for client viewing */}
      <Route path="/quote/:quoteNumber" component={PublicQuote} />
      <Route path="/receipt/:quoteNumber" component={PublicReceipt} />
      <Route path="/receipt/:quoteNumber/pdf" component={PublicReceiptPDF} />
      <Route path="/public-receipt/:quoteNumber" component={PublicReceipt} />

      {/* Protected routes */}
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/clients">
        <ProtectedRoute>
          <Clients />
        </ProtectedRoute>
      </Route>
      <Route path="/clients/:clientId">
        <ProtectedRoute>
          <ClientProfile />
        </ProtectedRoute>
      </Route>
      <Route path="/quotes">
        <ProtectedRoute>
          <Quotes />
        </ProtectedRoute>
      </Route>
      <Route path="/new-quote">
        <ProtectedRoute>
          <NewQuote />
        </ProtectedRoute>
      </Route>
      <Route path="/quotes/:quoteId/edit">
        <ProtectedRoute>
          <NewQuote />
        </ProtectedRoute>
      </Route>
      <Route path="/quotes/view/:quoteId">
        <ProtectedRoute>
          <QuoteView />
        </ProtectedRoute>
      </Route>
      <Route path="/quotes/:id/receipt">
        <ProtectedRoute>
          <ReceiptView />
        </ProtectedRoute>
      </Route>
      <Route path="/reviews">
        <ProtectedRoute>
          <Reviews />
        </ProtectedRoute>
      </Route>
      <Route path="/saved-items">
        <ProtectedRoute>
          <SavedItemsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path="/plans">
        <ProtectedRoute>
          <Plans />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      <Route path="/referrals">
        <ProtectedRoute>
          <ReferralsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/welcome">
        <ProtectedRoute>
          <Welcome />
        </ProtectedRoute>
      </Route>
      
      {/* Admin-only route */}
      <Route path="/admin">
        <ProtectedRoute adminOnly>
          <AdminPanel />
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Check if this is a public route (quote or receipt)
  const isPublicRoute = window.location.pathname.startsWith('/quote/') || 
                       window.location.pathname.startsWith('/receipt/');

  if (!isAuthenticated) {
    return <Router />;
  }

  // Check if user needs onboarding
  const hasCompletedOnboarding = localStorage.getItem('fechou_onboarding_completed');

  // Show onboarding for new users
  if (!hasCompletedOnboarding) {
    return <Welcome />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-brand-primary to-brand-secondary">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <Router />
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <AppLayout />
          <InstallPrompt />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;