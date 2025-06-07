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

  const updatePlanMutation = useMutation({
    mutationFn: async (plan: string) => {
      await apiRequest("PATCH", "/api/user/plan", { plan });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Sucesso",
        description: "Plano atualizado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Erro",
        description: "Erro ao atualizar plano. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = () => {
    updatePlanMutation.mutate("PREMIUM");
  };

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

      <Card className="bg-yellow-50 border-yellow-200 mb-8">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-yellow-600 text-xs font-bold">β</span>
            </div>
            <div>
              <h3 className="font-semibold text-yellow-800 mb-1">Versão Beta</h3>
              <p className="text-yellow-700 text-sm">
                Estamos em fase beta! Por tempo limitado, você pode alternar entre os planos gratuitamente 
                para testar todas as funcionalidades premium.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                {currentPlan === "FREE" ? "Plano Atual" : "Fazer Downgrade"}
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
                variant={currentPlan === "PREMIUM" ? "secondary" : "default"}
                onClick={handleUpgrade}
                disabled={updatePlanMutation.isPending}
              >
                {currentPlan === "PREMIUM" ? "Plano Atual" : "Ativar Premium"}
              </Button>

              {currentPlan === "FREE" && (
                <p className="text-center text-sm text-gray-600 mt-3">
                  7 dias grátis para testar
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}