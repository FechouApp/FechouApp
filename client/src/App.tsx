import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard-simple";
import Clients from "@/pages/clients";
import Quotes from "@/pages/quotes";
import NewQuote from "@/pages/new-quote";
import Reviews from "@/pages/reviews";
import Plans from "@/pages/plans";
import Settings from "@/pages/settings";
import QuoteView from "@/pages/quote-view";
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public route for quote viewing */}
      <Route path="/quote/:quoteNumber" component={QuoteView} />
      
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/clients" component={Clients} />
          <Route path="/quotes" component={Quotes} />
          <Route path="/quotes/:id/edit" component={NewQuote} />
          <Route path="/new-quote" component={NewQuote} />
          <Route path="/reviews" component={Reviews} />
          <Route path="/plans" component={Plans} />
          <Route path="/settings" component={Settings} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Cabeçalho Fixo */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <img 
                src="/attached_assets/Imagem do WhatsApp de 2025-06-02 à(s) 10.57.31_271fccf2.jpg" 
                alt="Fechou!" 
                className="h-10 w-auto"
              />
              <span className="text-xl font-bold text-gray-800">Fechou!</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Layout Responsivo */}
      <div className="pt-16 flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <MobileHeader />
          <main className="flex-1 p-6">
            <Router />
          </main>
        </div>
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
