import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Share2, Users, Gift, Copy, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

export default function ReferralShare() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Buscar código de indicação
  const { data: referralData, isLoading } = useQuery<{ referralCode: string }>({
    queryKey: ["/api/referrals/my-code"],
    enabled: !!user
  });

  // Buscar minhas indicações
  const { data: myReferrals = [] } = useQuery<any[]>({
    queryKey: ["/api/referrals/my-referrals"],
    enabled: !!user
  });

  const referralCode = referralData?.referralCode;
  const shareUrl = `https://meufechou.com.br?ref=${referralCode}`;
  const shareText = `🎯 Descubra o Fechou! - O app que revoluciona orçamentos para pequenos negócios!\n\n✨ Use meu código ${referralCode} e ganhe benefícios especiais!\n\n${shareUrl}`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copiado!",
        description: "Link de indicação copiado para a área de transferência",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link",
        variant: "destructive",
      });
    }
  };

  const shareViaWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const isPremium = user?.plan === "PREMIUM" || user?.plan === "PREMIUM_CORTESIA";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Sistema de Indicações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border">
              <h3 className="font-semibold text-lg mb-2">Como funciona?</h3>
              <div className="space-y-2 text-sm">
                {isPremium ? (
                  <>
                    <p>• Como usuário Premium, ganhe <strong>+15 dias</strong> para cada amigo que assinar o Premium</p>
                    <p>• Seu amigo ganha acesso completo ao Fechou!</p>
                    <p>• Sem limite de indicações!</p>
                  </>
                ) : (
                  <>
                    <p>• Ganhe <strong>+1 orçamento extra por mês</strong> para cada amigo indicado</p>
                    <p>• Seu amigo ganha acesso completo ao Fechou!</p>
                    <p>• Acumule orçamentos extras todos os meses</p>
                  </>
                )}
              </div>
            </div>

            {/* Código de Indicação */}
            <div>
              <label className="text-sm font-medium">Seu código de indicação:</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={referralCode || ""}
                  readOnly
                  className="font-mono text-center text-sm sm:text-lg font-bold"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(referralCode || "")}
                  disabled={!referralCode}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Link de Compartilhamento */}
            <div>
              <label className="text-sm font-medium">Link de indicação:</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={shareUrl}
                  readOnly
                  className="text-xs sm:text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(shareUrl)}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Botões de Compartilhamento */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={shareViaWhatsApp}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Compartilhar no WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={() => copyToClipboard(shareText)}
                className="w-full"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Mensagem
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas de Indicações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Suas Indicações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{user?.referralCount || 0}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total de Indicações</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{user?.bonusQuotes || 0}</div>
              <div className="text-xs sm:text-sm text-gray-600">Orçamentos Bônus</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg col-span-2 sm:col-span-1">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">{myReferrals.length}</div>
              <div className="text-xs sm:text-sm text-gray-600">Indicações Ativas</div>
            </div>
          </div>

          {myReferrals.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Histórico de Indicações</h4>
              <div className="space-y-2">
                {myReferrals.slice(0, 5).map((referral: any) => (
                  <div key={referral.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Gift className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium">Indicação #{referral.id.slice(-6)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(referral.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={referral.status === "rewarded" ? "default" : "secondary"}
                      className={referral.status === "rewarded" ? "bg-green-500" : ""}
                    >
                      {referral.status === "rewarded" ? "Recompensado" : "Pendente"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}