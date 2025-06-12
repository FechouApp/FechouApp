import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/common/loading-spinner";
import BackButton from "@/components/common/back-button";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Crown, Check, X, Calendar, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  // Get detailed plan information
  const { data: planLimits } = useQuery({
    queryKey: ["/api/user/plan-limits"],
    enabled: !!user,
  });

  const currentPlan = user?.plan || "FREE";
  const hasPremiumAccess = (planLimits as any)?.isPremium || false;
  const isExpired = (planLimits as any)?.isExpired || false;
  const planExpiresAt = (planLimits as any)?.planExpiresAt;
  const quotesUsed = (planLimits as any)?.currentMonthQuotes || 0;
  const quotesLimit = (planLimits as any)?.monthlyQuoteLimit;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <BackButton />
      
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Planos</h1>
        <p className="text-gray-600">Escolha o plano ideal para o seu negócio</p>
        
        {/* Status atual do usuário */}
        {currentPlan !== "FREE" && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-800">
                {currentPlan === "PREMIUM_CORTESIA" ? "Premium Cortesia" : "Premium"}
              </span>
              {hasPremiumAccess && <Badge variant="secondary">Ativo</Badge>}
              {isExpired && <Badge variant="destructive">Expirado</Badge>}
            </div>
            
            {hasPremiumAccess && (
              <div className="text-center">
                <p className="text-sm text-blue-700 mb-1">Orçamentos ilimitados este mês</p>
                <p className="text-xs text-blue-600">{quotesUsed} orçamentos criados</p>
                {planExpiresAt && currentPlan === "PREMIUM" && (
                  <p className="text-xs text-blue-600 mt-1">
                    Expira em: {format(new Date(planExpiresAt), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
                {currentPlan === "PREMIUM_CORTESIA" && (
                  <p className="text-xs text-blue-600 mt-1">Sem data de expiração</p>
                )}
              </div>
            )}
            
            {isExpired && (
              <p className="text-xs text-red-600 text-center">
                Plano expirado - acesso limitado ativado
              </p>
            )}
          </div>
        )}
        
        {currentPlan === "FREE" && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 max-w-md mx-auto">
            <div className="text-center">
              <p className="text-sm text-gray-700 mb-1">Plano Gratuito Ativo</p>
              <p className="text-xs text-gray-600">
                {quotesUsed} de {quotesLimit || 5} orçamentos utilizados este mês
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, ((quotesUsed / (quotesLimit || 5)) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        )}
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
                  <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-gray-500">Recibos ilimitados</span>
                </li>
                <li className="flex items-center gap-3">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-gray-500">Envio de recibos por WhatsApp</span>
                </li>
                <li className="flex items-center gap-3">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-gray-500">Logotipo no orçamento e recibo</span>
                </li>
                <li className="flex items-center gap-3">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-gray-500">Relatórios estatísticos avançados</span>
                </li>
                <li className="flex items-center gap-3">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-gray-500">15 itens favoritos salvos</span>
                </li>
                <li className="flex items-center gap-3">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-gray-500">Monitoramento de prazos</span>
                </li>
                <li className="flex items-center gap-3">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-gray-500">Suporte técnico prioritário</span>
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
                  <span className="text-gray-700">Emissão de orçamentos ilimitados</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Emissão de recibos ilimitados</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Envio de recibos por WhatsApp</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Logotipo no orçamento e no recibo</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Relatórios estatísticos avançados</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Salvamento de até 15 itens favoritos</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Monitoramento de prazos</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Suporte técnico prioritário</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">7 dias de garantia com devolução</span>
                </li>
              </ul>

              <Button 
                className="w-full" 
                variant={hasPremiumAccess ? "secondary" : "default"}
                disabled={hasPremiumAccess && !isExpired}
                onClick={() => {
                  if (!hasPremiumAccess || isExpired) {
                    window.open("https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=2c9380849763dae001976518e1ce0072", "_blank");
                  }
                }}
              >
                {hasPremiumAccess && !isExpired ? (
                  currentPlan === "PREMIUM_CORTESIA" ? "Plano Cortesia Ativo" : "Plano Premium Ativo"
                ) : (
                  isExpired ? "RENOVAR AGORA" : "ATIVE AGORA"
                )}
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