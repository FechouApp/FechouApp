import { Route, Switch, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "@/lib/queryClient";
import { useEffect } from "react";

// Pages
import Dashboard from "@/pages/dashboard";
import DashboardSimple from "@/pages/dashboard-simple";
import Clients from "@/pages/clients";
import Quotes from "@/pages/quotes";
import NewQuote from "@/pages/new-quote";
import QuoteView from "@/pages/quote-view";
import PublicQuote from "@/pages/public-quote";
import Reviews from "@/pages/reviews";
import Settings from "@/pages/settings";
import Landing from "@/pages/landing";
import Plans from "@/pages/plans";
import PlanComparison from "@/pages/plan-comparison";
import NotFound from "@/pages/not-found";

// Components
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/common/loading-spinner";

function App() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  // Handle client-side routing for SPA
  useEffect(() => {
    const handlePopState = () => {
      // Force a re-render when browser back/forward is used
      window.location.reload();
    };

    // Override the default browser behavior for navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      // Dispatch a custom event to update the route
      window.dispatchEvent(new PopStateEvent('popstate'));
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      // Dispatch a custom event to update the route
      window.dispatchEvent(new PopStateEvent('popstate'));
    };

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gray-50">
          <Landing />
          <Toaster />
        </div>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <div className="lg:hidden">
          <MobileHeader />
        </div>

        <div className="flex">
          <div className="hidden lg:block">
            <Sidebar />
          </div>

          <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/dashboard-simple" component={DashboardSimple} />
              <Route path="/clients" component={Clients} />
              <Route path="/quotes" component={Quotes} />
              <Route path="/quotes/new" component={NewQuote} />
              <Route path="/quotes/:id" component={QuoteView} />
              <Route path="/quotes/:id/edit" component={NewQuote} />
              <Route path="/public/:quoteNumber" component={PublicQuote} />
              <Route path="/reviews" component={Reviews} />
              <Route path="/settings" component={Settings} />
              <Route path="/plans" component={Plans} />
              <Route path="/plan-comparison" component={PlanComparison} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>

        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;