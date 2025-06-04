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
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import LoadingSpinner from "@/components/common/loading-spinner";
import Reports from "@/pages/reports";
import SavedItemsPage from "@/pages/saved-items";
import ClientProfile from "@/pages/client-profile";
import AdminPanel from "@/pages/admin-simple";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public route for client quote viewing */}
      <Route path="/quote/:quoteNumber" component={PublicQuote} />

      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/clients" component={Clients} />
          <Route path="/clients/:clientId" component={ClientProfile} />
          <Route path="/quotes" component={Quotes} />
          <Route path="/new-quote" component={NewQuote} />
          <Route path="/quotes/:quoteId/edit" component={NewQuote} />
          <Route path="/quotes/view/:quoteId" component={QuoteView} />
          <Route path="/reviews" component={Reviews} />
          <Route path="/saved-items" component={SavedItemsPage} />
          <Route path="/reports" component={Reports} />
          <Route path="/plans" component={PlanComparison} />
          <Route path="/settings" component={Settings} />
          <Route path="/admin" component={AdminPanel} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Router />;
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