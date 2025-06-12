import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/common/loading-spinner";
import BackButton from "@/components/common/back-button";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Crown, Check, X } from "lucide-react";

export default function Plans() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading, isPremium } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);



  if (authLoading) {
    return <LoadingSpinner />;
  }

  const currentPlan = user?.plan || "FREE";
  const quotesUsed = user?.monthlyQuotes || 0;
  const quotesLimit = user?.quotesLimit || 5;
  const quotesRemaining = Math.max(0, quotesLimit - quotesUsed);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <BackButton />
      
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Planos</h1>
        <p className="text-gray-600">Escolha o plano ideal para o seu negócio</p>
      </div>



      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Free Plan */}
          <Card className="bg-white shadow-lg relative">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Plano Gratuito</h3>
                <div className="text-4xl font-bold text-gray-800 mb-2">R$ 0</div>
                <p className="text-gray-600">Para sempre</p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">5 orçamentos por mês</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">10 itens por orçamento</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Gerenciamento básico de clientes</span>
                </li>
                <li className="flex items-center gap-3">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-gray-500">Relatórios avançados</span>
                </li>
                <li className="flex items-center gap-3">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-gray-500">Monitoramento de prazos</span>
                </li>
              </ul>

              <Button 
                className="w-full" 
                variant={currentPlan === "FREE" ? "secondary" : "outline"}
                disabled
              >
                {currentPlan === "FREE" ? "Plano Atual" : "Plano Gratuito"}
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="bg-white shadow-lg relative border-2 border-brand-primary">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-brand-primary text-white px-6 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Recomendado
              </span>
            </div>
            
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Plano Premium</h3>
                <div className="text-4xl font-bold text-brand-primary mb-2">R$ 29</div>
                <p className="text-gray-600">por mês</p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Orçamentos ilimitados</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Itens ilimitados por orçamento</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Relatórios avançados e gráficos</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Monitoramento de prazos vencendo</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Suporte prioritário</span>
                </li>
              </ul>

              <Button 
                className="w-full" 
                variant={currentPlan === "PREMIUM" || currentPlan === "PREMIUM_CORTESIA" ? "secondary" : "default"}
                disabled={currentPlan === "PREMIUM" || currentPlan === "PREMIUM_CORTESIA"}
                onClick={() => {
                  if (!(currentPlan === "PREMIUM" || currentPlan === "PREMIUM_CORTESIA")) {
                    window.open("https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=2c9380849763dae001976518e1ce0072", "_blank");
                  }
                }}
              >
                {currentPlan === "PREMIUM" || currentPlan === "PREMIUM_CORTESIA" ? "Plano Atual" : "ATIVE AGORA"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Beta Version Notice */}
        <Card className="bg-blue-50 border-blue-200 mt-12 mx-auto max-w-4xl">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-bold">β</span>
                </div>
                <h3 className="text-lg font-semibold text-blue-800">Versão Beta</h3>
              </div>
              <p className="text-blue-700 mb-4 leading-relaxed">
                O Fechou! ainda está em versão beta, trabalhando continuamente para melhorar sua experiência. 
                Sua opinião é muito importante para nós!
              </p>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-blue-800 font-medium mb-2">
                  Tem dúvidas, problemas ou sugestões?
                </p>
                <p className="text-blue-700">
                  Entre em contato conosco: <span className="font-semibold">suporte@meufechou.com.br</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}