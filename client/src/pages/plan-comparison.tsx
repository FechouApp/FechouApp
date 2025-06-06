import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown, Gift, Users, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PlanComparison() {
  const { user, isPremium } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const typedUser = user as any;

  const togglePlanMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/auth/toggle-plan", "POST");
    },
    onSuccess: () => {
      toast({
        title: "Plano alterado com sucesso!",
        description: "Seu plano foi atualizado. Explore as novas funcionalidades.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/plan-limits"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao alterar plano",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    },
  });

  const addReferralMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/user/referral", "POST");
    },
    onSuccess: () => {
      toast({
        title: "Indicação adicionada!",
        description: "+1 orçamento bônus foi adicionado à sua conta.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/plan-limits"] });
    },
  });

  const bonusQuotes = typedUser?.bonusQuotes || 0;
  const referralCount = typedUser?.referralCount || 0;

  const features = [
    {
      name: "Orçamentos por mês",
      free: "5 + bônus indicações",
      premium: "Ilimitados",
      icon: <Zap className="w-4 h-4" />
    },
    {
      name: "PDF com marca d'água",
      free: true,
      premium: false,
      icon: <Check className="w-4 h-4" />
    },
    {
      name: "Logo personalizado",
      free: false,
      premium: true,
      icon: <Crown className="w-4 h-4" />
    },

    {
      name: "Envio por e-mail",
      free: false,
      premium: true,
      icon: <Crown className="w-4 h-4" />
    },
    {
      name: "Anexar documentos",
      free: false,
      premium: true,
      icon: <Crown className="w-4 h-4" />
    },


    {
      name: "Notificações em tempo real",
      free: false,
      premium: true,
      icon: <Crown className="w-4 h-4" />
    },
    {
      name: "Suporte prioritário",
      free: false,
      premium: true,
      icon: <Crown className="w-4 h-4" />
    }
  ];

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Planos do Fechou!</h1>
        <p className="text-sm sm:text-base lg:text-lg text-gray-600">
          Escolha o plano ideal para o seu negócio
        </p>
        
        {/* Status do Plano Atual */}
        <div className="mt-6 flex justify-center">
          <Badge variant={isPremium ? "default" : "secondary"} className="text-lg px-4 py-2">
            {isPremium ? (
              <>
                <Crown className="w-4 h-4 mr-2" />
                Plano Premium Ativo
              </>
            ) : (
              <>
                <Gift className="w-4 h-4 mr-2" />
                Plano Gratuito
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Sistema de Indicações */}
      {!isPremium && (
        <Card className="mb-8 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Users className="w-5 h-5" />
              Sistema de Indicações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{referralCount}</div>
                <div className="text-sm text-green-700">Indicações feitas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{bonusQuotes}</div>
                <div className="text-sm text-green-700">Orçamentos bônus</div>
              </div>
              <div>
                <Button 
                  onClick={() => addReferralMutation.mutate()}
                  disabled={addReferralMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  + Simular Indicação
                </Button>
              </div>
            </div>
            <p className="text-sm text-green-700 mt-4 text-center">
              Cada pessoa que você indicar gera +1 orçamento bônus no seu plano gratuito!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Comparação de Planos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Plano Gratuito */}
        <Card className={`relative ${!isPremium ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Gift className="w-5 h-5 text-blue-600" />
              Plano Gratuito
            </CardTitle>
            <div className="text-3xl font-bold text-blue-600">R$ 0</div>
            <div className="text-gray-500">para sempre</div>
          </CardHeader>
          <CardContent className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {feature.icon}
                  <span className="text-sm">{feature.name}</span>
                </div>
                <div>
                  {typeof feature.free === 'boolean' ? (
                    feature.free ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <X className="w-4 h-4 text-red-500" />
                    )
                  ) : (
                    <span className="text-sm text-gray-600">{feature.free}</span>
                  )}
                </div>
              </div>
            ))}
            
            <div className="pt-4">
              {!isPremium ? (
                <Badge variant="default" className="w-full justify-center py-2">
                  Plano Atual
                </Badge>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => togglePlanMutation.mutate()}
                  disabled={togglePlanMutation.isPending}
                >
                  Voltar para Gratuito
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plano Premium */}
        <Card className={`relative ${isPremium ? 'ring-2 ring-green-500 ring-offset-2' : 'border-green-200'}`}>
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-green-600 hover:bg-green-700">
              <Crown className="w-3 h-3 mr-1" />
              Mais Popular
            </Badge>
          </div>
          <CardHeader className="text-center pt-6">
            <CardTitle className="flex items-center justify-center gap-2">
              <Crown className="w-5 h-5 text-green-600" />
              Plano Premium
            </CardTitle>
            <div className="text-3xl font-bold text-green-600">R$ 29,90</div>
            <div className="text-gray-500">por mês</div>
          </CardHeader>
          <CardContent className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {feature.icon}
                  <span className="text-sm">{feature.name}</span>
                </div>
                <div>
                  {typeof feature.premium === 'boolean' ? (
                    feature.premium ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <X className="w-4 h-4 text-red-500" />
                    )
                  ) : (
                    <span className="text-sm text-gray-600">{feature.premium}</span>
                  )}
                </div>
              </div>
            ))}
            
            <div className="pt-4">
              {isPremium ? (
                <Badge variant="default" className="w-full justify-center py-2 bg-green-600">
                  Plano Atual
                </Badge>
              ) : (
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => togglePlanMutation.mutate()}
                  disabled={togglePlanMutation.isPending}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Ativar Premium
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botão de Teste para Desenvolvimento */}
      <div className="mt-8 text-center">
        <Button 
          variant="outline"
          onClick={() => togglePlanMutation.mutate()}
          disabled={togglePlanMutation.isPending}
          className="border-dashed"
        >
          🔄 Alternar Plano (Modo Teste)
        </Button>
      </div>
    </div>
  );
}