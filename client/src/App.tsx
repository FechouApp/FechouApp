
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
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
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import LoadingSpinner from "@/components/common/loading-spinner";
import Reports from "@/pages/reports";
import SavedItemsPage from "@/pages/saved-items";
import ClientProfile from "@/pages/client-profile";
import AdminPanel from "@/pages/admin-dashboard";
import Welcome from "@/pages/welcome";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if this is a public quote route
  const isPublicQuoteRoute = window.location.pathname.startsWith('/quote/');
  
  // Allow public access to quote pages
  if (!isAuthenticated && !isPublicQuoteRoute) {
    return <Landing />;
  }

  // If not authenticated but accessing public quote, show only the public quote
  if (!isAuthenticated && isPublicQuoteRoute) {
    return (
      <Switch>
        <Route path="/quote/:quoteNumber" component={PublicQuote} />
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
      
      <Route path="/" component={Dashboard} />
      <Route path="/clients" component={Clients} />
      <Route path="/clients/:clientId" component={ClientProfile} />
      <Route path="/quotes" component={Quotes} />
      <Route path="/new-quote" component={NewQuote} />
      <Route path="/quotes/:quoteId/edit" component={NewQuote} />
      <Route path="/quotes/view/:quoteId" component={QuoteView} />
      <Route path="/quotes/:id/receipt" component={ReceiptView} />
      <Route path="/reviews" component={Reviews} />
      <Route path="/saved-items" component={SavedItemsPage} />
      <Route path="/reports" component={Reports} />
      <Route path="/plans" component={Plans} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/welcome" component={Welcome} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Check if this is a public quote route
  const isPublicQuoteRoute = window.location.pathname.startsWith('/quote/');

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
      <TooltipProvider>
        <Toaster />
        <AppLayout />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
