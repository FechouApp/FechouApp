import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Copy, Share2, Users, Gift, Percent, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ReferralPanel() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Get referral link
  const { data: referralData, isLoading: linkLoading } = useQuery({
    queryKey: ['/api/user/referral/link'],
  });

  // Get referral stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/user/referral/stats'],
  });

  // Generate new referral code mutation
  const generateCodeMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/user/referral/generate'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/referral/link'] });
      toast({
        title: "Código gerado!",
        description: "Seu novo código de indicação foi criado.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao gerar código de indicação.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copiado!",
        description: "Link de indicação copiado para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      });
    }
  };

  const shareLink = async () => {
    if (navigator.share && (referralData as any)?.referralLink) {
      try {
        await navigator.share({
          title: 'Fechou! - Sistema de Orçamentos',
          text: 'Crie orçamentos profissionais de forma fácil e rápida!',
          url: (referralData as any).referralLink,
        });
      } catch (err) {
        // Fallback to copy if sharing fails
        copyToClipboard((referralData as any).referralLink);
      }
    } else if ((referralData as any)?.referralLink) {
      copyToClipboard((referralData as any).referralLink);
    }
  };

  if (linkLoading || statsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPremium = (stats as any)?.discountPercentage !== undefined && (stats as any).discountPercentage > 0;
  const nextRewardThreshold = isPremium ? 5 : Math.min(((stats as any)?.monthlyReferrals || 0) + 1, 5);
  const progressToNext = isPremium 
    ? Math.min(((stats as any)?.monthlyReferrals || 0) / 5 * 100, 100)
    : Math.min(((stats as any)?.monthlyReferrals || 0) / nextRewardThreshold * 100, 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Sistema de Indicações</h3>
        <p className="text-sm text-gray-600">
          Convide amigos e ganhe recompensas! Compartilhe seu link e ganhe benefícios quando eles se cadastrarem.
        </p>
      </div>

      {/* Referral Link Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Share2 className="w-5 h-5" />
            Seu Link de Indicação
          </CardTitle>
          <CardDescription>
            Compartilhe este link para convidar novos usuários
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={(referralData as any)?.referralLink || ''}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard((referralData as any)?.referralLink || '')}
              disabled={!(referralData as any)?.referralLink}
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={shareLink}
              disabled={!(referralData as any)?.referralLink}
            >
              <Share2 className="w-4 h-4" />
              Compartilhar
            </Button>
          </div>

          {!(referralData as any)?.referralCode && (
            <Button
              onClick={() => generateCodeMutation.mutate()}
              disabled={generateCodeMutation.isPending}
              className="w-full"
            >
              Gerar Código de Indicação
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Indicações</p>
                <p className="text-2xl font-bold">{(stats as any)?.totalReferrals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Este Mês</p>
                <p className="text-2xl font-bold">{(stats as any)?.monthlyReferrals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Gift className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Orçamentos Extras</p>
                <p className="text-2xl font-bold">{(stats as any)?.bonusQuotes || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Percent className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Desconto Atual</p>
                <p className="text-2xl font-bold">{(stats as any)?.discountPercentage || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rewards Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como Funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free Plan Rewards */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Plano Gratuito</Badge>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2"></div>
                  <span>Ganhe <strong>1 orçamento extra</strong> por indicação</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2"></div>
                  <span>Máximo de <strong>5 orçamentos extras</strong> por mês</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2"></div>
                  <span>Contador zera todo mês</span>
                </li>
              </ul>
            </div>

            {/* Premium Plan Rewards */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="default">Plano Premium</Badge>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2"></div>
                  <span>Ganhe <strong>10% de desconto</strong> por indicação</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2"></div>
                  <span><strong>5 indicações</strong> = mensalidade grátis</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2"></div>
                  <span>Benefício aplicado na próxima cobrança</span>
                </li>
              </ul>
            </div>
          </div>

          <Separator />

          {/* Progress to Next Reward */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Progresso para Próxima Recompensa
              </span>
              <span className="text-sm text-gray-600">
                {(stats as any)?.monthlyReferrals || 0} / {nextRewardThreshold}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressToNext}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600">
              {isPremium 
                ? `Indique mais ${Math.max(0, 5 - ((stats as any)?.monthlyReferrals || 0))} pessoas para ter mensalidade grátis!`
                : `Indique mais ${Math.max(0, nextRewardThreshold - ((stats as any)?.monthlyReferrals || 0))} pessoas para ganhar orçamentos extras!`
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regras Importantes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
              <span>O indicado precisa completar o cadastro para validar a indicação</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
              <span>Apenas uma indicação por CPF/email será considerada</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
              <span>Os contadores mensais são resetados no início de cada mês</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
              <span>Você não pode se auto-indicar ou indicar a mesma pessoa</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}