import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Building, Bell, Crown, Mail, Phone, MapPin, Save, Upload, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@/types";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const typedUser = user as UserType;
  const [formData, setFormData] = useState({
    firstName: typedUser?.firstName || "",
    lastName: typedUser?.lastName || "",
    cpfCnpj: typedUser?.cpfCnpj || "",
    profession: typedUser?.profession || "",
    businessName: typedUser?.businessName || "",
    phone: (typedUser as any)?.phone || "",
    address: (typedUser as any)?.address || "",
    pixKey: typedUser?.pixKey || "",
    whatsappNotifications: typedUser?.whatsappNotifications || false,
    emailNotifications: typedUser?.emailNotifications || true,
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: Partial<UserType>) => {
      await apiRequest("PUT", "/api/auth/user", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Configurações</h1>
        <p className="text-gray-600">Gerencie suas informações pessoais e preferências</p>
      </div>

      <div className="grid gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    placeholder="Seu primeiro nome"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Sobrenome</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    placeholder="Seu sobrenome"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
                  <Input
                    id="cpfCnpj"
                    value={formData.cpfCnpj}
                    onChange={(e) => handleInputChange("cpfCnpj", e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <Label htmlFor="profession">Profissão</Label>
                  <Input
                    id="profession"
                    value={formData.profession}
                    onChange={(e) => handleInputChange("profession", e.target.value)}
                    placeholder="Ex: Eletricista, Pedreiro, etc."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="businessName">Nome do Negócio (opcional)</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  placeholder="Nome da sua empresa ou negócio"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="Rua, número, bairro, cidade"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={updateUserMutation.isPending}
                className="w-full md:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateUserMutation.isPending ? "Salvando..." : "Salvar Informações"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Informações do Negócio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pixKey">Chave PIX</Label>
              <Input
                id="pixKey"
                value={formData.pixKey}
                onChange={(e) => handleInputChange("pixKey", e.target.value)}
                placeholder="Digite sua chave PIX"
              />
              <p className="text-sm text-gray-500 mt-1">
                Será exibida nos orçamentos para facilitar pagamentos
              </p>
            </div>

            {user?.plan === "premium" && (
              <div>
                <Label>Logo do Negócio</Label>
                <div className="mt-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Clique para fazer upload do seu logo
                  </p>
                  <p className="text-xs text-gray-400">PNG, JPG até 2MB</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Seu Plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={user?.plan === "premium" ? "default" : "secondary"}>
                    {user?.plan === "premium" ? "Premium" : "Gratuito"}
                  </Badge>
                  {user?.plan === "premium" && (
                    <Crown className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {user?.quotesLimit ? `${user.monthlyQuotes}/${user.quotesLimit} orçamentos este mês` : "Orçamentos ilimitados"}
                </p>
              </div>
              {user?.plan !== "premium" && (
                <Button variant="outline">
                  Fazer Upgrade
                </Button>
              )}
            </div>

            <div className="text-xs text-gray-500">
              <strong>Recursos do seu plano:</strong>
              <ul className="mt-2 space-y-1">
                {user?.plan === "premium" ? (
                  <>
                    <li>✓ Orçamentos ilimitados</li>
                    <li>✓ Logo personalizado</li>
                    <li>✓ Link personalizado</li>
                    <li>✓ Envio por WhatsApp e e-mail</li>
                    <li>✓ Suporte prioritário</li>
                  </>
                ) : (
                  <>
                    <li>✓ Até 5 orçamentos por mês</li>
                    <li>✓ Envio por WhatsApp</li>
                    <li>✗ Logo personalizado</li>
                    <li>✗ Link personalizado</li>
                    <li>✗ Envio por e-mail</li>
                  </>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailNotifications">Notificações por E-mail</Label>
                <p className="text-sm text-gray-500">
                  Receba atualizações sobre seus orçamentos por e-mail
                </p>
              </div>
              <Switch
                id="emailNotifications"
                checked={formData.emailNotifications}
                onCheckedChange={(checked) => handleInputChange("emailNotifications", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="whatsappNotifications">Notificações por WhatsApp</Label>
                <p className="text-sm text-gray-500">
                  Receba notificações importantes via WhatsApp
                </p>
              </div>
              <Switch
                id="whatsappNotifications"
                checked={formData.whatsappNotifications}
                onCheckedChange={(checked) => handleInputChange("whatsappNotifications", checked)}
                disabled={user?.plan !== "premium"}
              />
            </div>
            
            {user?.plan !== "premium" && (
              <p className="text-xs text-amber-600">
                Notificações por WhatsApp disponíveis apenas no plano Premium
              </p>
            )}
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Segurança da Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Alteração de Senha</h4>
              <p className="text-sm text-blue-700 mb-4">
                Para alterar sua senha, você precisa fazer logout e usar a opção "Esqueci minha senha" 
                na tela de login, ou acessar as configurações da sua conta Replit.
              </p>
              <Button 
                variant="outline" 
                onClick={() => window.open('https://replit.com/account', '_blank')}
                className="w-full md:w-auto"
              >
                Gerenciar Conta Replit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações da Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "/api/logout"}
              className="w-full md:w-auto"
            >
              Sair da Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}