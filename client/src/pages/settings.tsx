import { useState, useEffect } from "react";
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
import { formatPhone, formatCPF, formatCEP } from "@/lib/utils";
import type { User as UserType } from "@/types";

export default function Settings() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const typedUser = user as UserType;

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    cpfCnpj: "",
    profession: "",
    businessName: "",
    phone: "",
    address: "",
    cep: "", // new field
    numero: "", // new field
    complemento: "", // new field
    cidade: "", // new field
    estado: "", // new field
    pixKey: "",
    logoUrl: "",
    profileImageUrl: "",
    primaryColor: "#3B82F6",
    secondaryColor: "#10B981",
    whatsappNotifications: false,
    emailNotifications: true,
  });

  // Atualizar formData quando user estiver disponível
  useEffect(() => {
    if (typedUser) {
      setFormData({
        firstName: typedUser.firstName || "",
        lastName: typedUser.lastName || "",
        cpfCnpj: formatCPF(typedUser.cpfCnpj || ""),
        profession: typedUser.profession || "",
        businessName: typedUser.businessName || "",
        phone: formatPhone((typedUser as any)?.phone || ""),
        address: (typedUser as any)?.address || "",
        cep: (typedUser as any)?.cep || "",
        numero: (typedUser as any)?.numero || "",
        complemento: (typedUser as any)?.complemento || "",
        cidade: (typedUser as any)?.cidade || "",
        estado: (typedUser as any)?.estado || "",
        pixKey: typedUser.pixKey || "",
        logoUrl: (typedUser as any)?.logoUrl || "",
        profileImageUrl: typedUser.profileImageUrl || "",
        primaryColor: (typedUser as any)?.primaryColor || "#3B82F6",
        secondaryColor: (typedUser as any)?.secondaryColor || "#10B981",
        whatsappNotifications: typedUser.whatsappNotifications || false,
        emailNotifications: typedUser.emailNotifications || true,
      });
    }
  }, [typedUser]);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: Partial<UserType>) => {
      const response = await apiRequest("PATCH", "/api/auth/user", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Configurações salvas",
        description: "Suas configurações foram atualizadas com sucesso!",
      });

     // Mark as visited and setup complete if user saves basic info
      if (formData.firstName && (formData.businessName || formData.profession)) {
        localStorage.setItem('fechou_has_visited', 'true');
      }

    },
    onError: (error: any) => {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      await apiRequest("POST", "/api/auth/change-password", data);
    },
    onSuccess: () => {
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({
        title: "Senha alterada!",
        description: "Sua senha foi alterada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível alterar a senha. Verifique a senha atual.",
        variant: "destructive",
      });
    },
  });

  const togglePlanMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/toggle-plan");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Plano alterado!",
        description: "O plano foi alterado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o plano.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    let formattedValue = value;

    // Aplicar formatação automática nos campos específicos
    if (typeof value === "string") {
      if (field === "cpfCnpj") {
        formattedValue = formatCPF(value);
      } else if (field === "phone") {
        formattedValue = formatPhone(value);
      } else if (field === "cep") {
        formattedValue = formatCEP(value);
      }
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }));
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar tamanho do arquivo (máx. 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "A imagem deve ter no máximo 2MB.",
          variant: "destructive",
        });
        return;
      }

      // Verificar tipo do arquivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione um arquivo de imagem válido.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        handleInputChange("profileImageUrl", base64String);

        // Auto-salvar após upload
        setTimeout(() => {
          updateUserMutation.mutate({
            ...formData,
            profileImageUrl: base64String
          });
        }, 500);

        toast({
          title: "Sucesso",
          description: "Foto de perfil carregada com sucesso!",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar tamanho do arquivo (máx. 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "A imagem deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      // Verificar tipo do arquivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione um arquivo de imagem válido.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        handleInputChange("logoUrl", base64String);

        // Auto-salvar após upload
        setTimeout(() => {
          updateUserMutation.mutate({
            ...formData,
            logoUrl: base64String
          });
        }, 500);

        toast({
          title: "Sucesso",
          description: "Logo carregado com sucesso!",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCEPChange = async (cep: string) => {
    if (cep.length === 9) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, '')}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            address: data.logradouro,
            complemento: data.complemento,
            cidade: data.localidade,
            estado: data.uf,
            bairro: data.bairro,
          }));
        } else {
          toast({
            title: "Erro",
            description: "CEP não encontrado.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao buscar CEP.",
          variant: "destructive",
        });
      }
    }
  };

  // Mostrar loading enquanto dados do usuário estão carregando
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando configurações...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Configurações</h1>
        <p className="text-sm sm:text-base text-gray-600">Gerencie suas informações pessoais e preferências</p>
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
              {/* Profile Photo */}
              <div>
                <Label htmlFor="profileImage">Foto de Perfil</Label>
                <div className="mt-2 space-y-3">
                  {formData.profileImageUrl && (
                    <div className="flex items-center gap-3">
                      <img
                        src={formData.profileImageUrl}
                        alt="Foto atual"
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleInputChange("profileImageUrl", "")}
                      >
                        Remover Foto
                      </Button>
                    </div>
                  )}
                  <input
                    type="file"
                    id="profileImage"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-sm text-gray-500">
                    Aparecerá em seus orçamentos e perfil público. Formatos aceitos: JPG, PNG (máx. 2MB)
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-gray-50 text-gray-600"
                />
                <p className="text-sm text-gray-500 mt-1">
                  O e-mail não pode ser alterado pois é usado para login
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => {
                      handleInputChange("cep", e.target.value);
                      handleCEPChange(e.target.value);
                    }}
                    placeholder="00000-000"
                  />
                </div>
              </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      placeholder="Rua"
                    />
                  </div>
                  <div>
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={formData.numero}
                      onChange={(e) => handleInputChange("numero", e.target.value)}
                      placeholder="Número"
                    />
                  </div>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      value={formData.complemento}
                      onChange={(e) => handleInputChange("complemento", e.target.value)}
                      placeholder="Complemento"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade}
                      onChange={(e) => handleInputChange("cidade", e.target.value)}
                      placeholder="Cidade"
                    />
                  </div>
               </div>
               <div>
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => handleInputChange("estado", e.target.value)}
                    placeholder="Estado"
                  />
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
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <Button 
                type="submit" 
                disabled={updateUserMutation.isPending}
                className="w-full md:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateUserMutation.isPending ? "Salvando..." : "Salvar PIX"}
              </Button>
            </form>

            {(user as any)?.plan === "PREMIUM" && (
              <div>
                <Label htmlFor="logoUpload">Logo da Empresa (Premium)</Label>
                <div className="mt-2 space-y-3">
                  {formData.logoUrl && (
                    <div className="flex items-center gap-3">
                      <img
                        src={formData.logoUrl}
                        alt="Logo atual"
                        className="w-16 h-16 object-contain border rounded"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleInputChange("logoUrl", "")}
                      >
                        Remover Logo
                      </Button>
                    </div>
                  )}
                  <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <input
                      type="file"
                      id="logoUpload"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="logoUpload"
                      className="cursor-pointer text-sm text-gray-600 hover:text-gray-800"
                    >
                      Clique para fazer upload do seu logo
                    </label>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG até 2MB</p>
                  </div>
                  <p className="text-sm text-gray-500">
                    Logo aparecerá no canto superior direito dos orçamentos Premium
                  </p>
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
                  <Badge variant={user?.plan === "PREMIUM" || user?.plan === "PREMIUM_CORTESIA" ? "default" : "secondary"}>
                    {user?.plan === "PREMIUM" || user?.plan === "PREMIUM_CORTESIA" ? "Premium" : "Gratuito"}
                  </Badge>
                  {(user?.plan === "PREMIUM" || user?.plan === "PREMIUM_CORTESIA") && (
                    <Crown className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {user?.quotesUsedThisMonth !== null && user?.quotesLimit ? `${user.quotesUsedThisMonth || 0}/${user.quotesLimit} orçamentos este mês` : "Orçamentos ilimitados"}
                </p>
              </div>
              {!(user?.plan === "PREMIUM" || user?.plan === "PREMIUM_CORTESIA") && (
                <Button variant="outline">
                  Fazer Upgrade
                </Button>
              )}
            </div>

            <div className="text-xs text-gray-500">
              <strong>Recursos do seu plano:</strong>
              <ul className="mt-2 space-y-1">
                {(user?.plan === "PREMIUM" || user?.plan === "PREMIUM_CORTESIA") ? (
                  <>
                    <li>✓ Orçamentos ilimitados</li>
                    <li>✓ Upload de fotos nos orçamentos</li>
                    <li>✓ Envio por WhatsApp</li>
                    <li>✓ Suporte prioritário</li>
                  </>
                ) : (
                  <>
                    <li>✓ Até 5 orçamentos por mês</li>
                    <li>✓ Envio por WhatsApp</li>
                    <li>✗ Upload de fotos</li>
                    <li>✗ Suporte prioritário</li>
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
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (passwordData.newPassword !== passwordData.confirmPassword) {
                toast({
                  title: "Erro",
                  description: "As senhas não coincidem.",
                  variant: "destructive",
                });
                return;
              }
              if (passwordData.newPassword.length < 6) {
                toast({
                  title: "Erro", 
                  description: "A nova senha deve ter pelo menos 6 caracteres.",
                  variant: "destructive",
                });
                return;
              }
              changePasswordMutation.mutate({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
              });
            }} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Digite sua senha atual"
                  required
                />
              </div>
              <div>
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Digite a nova senha (mín. 6 caracteres)"
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirme a nova senha"
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={changePasswordMutation.isPending}
                className="w-full md:w-auto"
              >
                <Lock className="w-4 h-4 mr-2" />
                {changePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
              </Button>
            </form>
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