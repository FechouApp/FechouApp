import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/common/loading-spinner";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Crown, 
  Check, 
  X, 
  Star, 
  FileText,
  Users,
  Mail,
  Image,
  Globe,
  BarChart3,
  HeadphonesIcon
} from "lucide-react";

export default function Plans() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect to home if not authenticated
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
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Planos</h1>
        <p className="text-white/70">Escolha o plano ideal para o seu negócio</p>
      </div>

      {/* Current Plan Status */}
      <Card className="brand-gradient shadow-lg">
        <CardContent className="p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">
                Plano Atual: {currentPlan === "FREE" ? "Gratuito" : "Premium"}
              </h3>
              <p className="text-blue-100">
                {quotesUsed} de {quotesLimit === 999999 ? "∞" : quotesLimit} orçamentos utilizados este mês
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {quotesLimit === 999999 ? "∞" : quotesRemaining}
              </div>
              <div className="text-sm text-blue-100">
                {quotesLimit === 999999 ? "Ilimitado" : "Orçamentos restantes"}
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          {quotesLimit !== 999999 && (
            <div className="mt-4">
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(quotesUsed / quotesLimit) * 100}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans Comparison */}
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

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Até 5 orçamentos por mês</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Gerenciamento básico de clientes</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Envio via WhatsApp</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">PDFs com marca d'água</span>
                </li>
                <li className="flex items-center gap-3 opacity-50">
                  <X className="w-5 h-5 text-red-500" />
                  <span className="text-gray-500">Envio por e-mail</span>
                </li>
                <li className="flex items-center gap-3 opacity-50">
                  <X className="w-5 h-5 text-red-500" />
                  <span className="text-gray-500">Logotipo personalizado</span>
                </li>
                <li className="flex items-center gap-3 opacity-50">
                  <X className="w-5 h-5 text-red-500" />
                  <span className="text-gray-500">Link personalizado</span>
                </li>
                <li className="flex items-center gap-3 opacity-50">
                  <X className="w-5 h-5 text-red-500" />
                  <span className="text-gray-500">Relatórios avançados</span>
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

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 font-medium">Orçamentos ilimitados</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 font-medium">Gerenciamento completo de clientes</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 font-medium">Envio via WhatsApp e e-mail</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 font-medium">PDFs sem marca d'água</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 font-medium">Logotipo personalizado</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 font-medium">Link personalizado</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 font-medium">Relatórios avançados</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 font-medium">Suporte prioritário</span>
                </li>
              </ul>

              <Button
                onClick={handleUpgrade}
                className="w-full brand-gradient text-white font-semibold"
                disabled={currentPlan === "PREMIUM" || updatePlanMutation.isPending}
              >
                {currentPlan === "PREMIUM" 
                  ? "Plano Atual" 
                  : updatePlanMutation.isPending 
                    ? "Processando..." 
                    : "Fazer Upgrade"
                }
              </Button>
              {currentPlan === "FREE" && (
                <p className="text-center text-sm text-gray-600 mt-3">
                  7 dias grátis para testar
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features Comparison Table */}
        <Card className="bg-white shadow-lg mt-8">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800 text-center">
              Comparação Detalhada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 text-gray-600 font-medium">Recursos</th>
                    <th className="text-center py-4 text-gray-600 font-medium">Gratuito</th>
                    <th className="text-center py-4 text-brand-primary font-medium">Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-4 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">Orçamentos por mês</span>
                    </td>
                    <td className="py-4 text-center text-gray-600">5</td>
                    <td className="py-4 text-center text-brand-primary font-semibold">Ilimitado</td>
                  </tr>
                  <tr>
                    <td className="py-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">Clientes cadastrados</span>
                    </td>
                    <td className="py-4 text-center text-gray-600">50</td>
                    <td className="py-4 text-center text-brand-primary font-semibold">Ilimitado</td>
                  </tr>
                  <tr>
                    <td className="py-4 flex items-center gap-2">
                      <Star className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">Marca d'água nos PDFs</span>
                    </td>
                    <td className="py-4 text-center text-red-500"><X className="w-5 h-5 mx-auto" /></td>
                    <td className="py-4 text-center text-green-500"><Check className="w-5 h-5 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-4 flex items-center gap-2">
                      <Image className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">Logotipo personalizado</span>
                    </td>
                    <td className="py-4 text-center text-red-500"><X className="w-5 h-5 mx-auto" /></td>
                    <td className="py-4 text-center text-green-500"><Check className="w-5 h-5 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-4 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">Envio por e-mail</span>
                    </td>
                    <td className="py-4 text-center text-red-500"><X className="w-5 h-5 mx-auto" /></td>
                    <td className="py-4 text-center text-green-500"><Check className="w-5 h-5 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-4 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">Link personalizado</span>
                    </td>
                    <td className="py-4 text-center text-red-500"><X className="w-5 h-5 mx-auto" /></td>
                    <td className="py-4 text-center text-green-500"><Check className="w-5 h-5 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">Relatórios e estatísticas</span>
                    </td>
                    <td className="py-4 text-center text-gray-600">Básico</td>
                    <td className="py-4 text-center text-brand-primary font-semibold">Avançado</td>
                  </tr>
                  <tr>
                    <td className="py-4 flex items-center gap-2">
                      <HeadphonesIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">Suporte</span>
                    </td>
                    <td className="py-4 text-center text-gray-600">Email</td>
                    <td className="py-4 text-center text-brand-primary font-semibold">Prioritário</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
