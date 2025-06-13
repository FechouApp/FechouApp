import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Building, Bell, Crown, Mail, Phone, MapPin, Save, Upload, Lock, Smartphone, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useFirebaseAuth";
import BackButton from "@/components/common/back-button";
import { useToast } from "@/hooks/use-toast";
import { formatPhone, formatCPF, formatCEP } from "@/lib/utils";
import InstallButton from "@/components/pwa/install-button";

export default function Settings() {
  const { user, isLoading, updateUserProfile, changePassword } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    cpfCnpj: "",
    profession: "",
    businessName: "",
    phone: "",
    address: "",
    cep: "",
    numero: "",
    complemento: "",
    cidade: "",
    estado: "",
    pixKey: "",
    logoUrl: "",
    profileImageUrl: "",
    notifications: false,
    whatsappNotifications: false,
    emailNotifications: false,
    darkMode: false,
    autoSave: false,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Carregar dados do usuário
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        cpfCnpj: user.cpfCnpj || "",
        profession: user.profession || "",
        businessName: user.businessName || "",
        phone: user.phone || "",
        address: user.address || "",
        cep: user.cep || "",
        numero: user.numero || "",
        complemento: user.complemento || "",
        cidade: user.cidade || "",
        estado: user.estado || "",
        pixKey: user.pixKey || "",
        logoUrl: user.logoUrl || "",
        profileImageUrl: user.profileImageUrl || "",
        notifications: user.notifications || false,
        whatsappNotifications: user.whatsappNotifications || false,
        emailNotifications: user.emailNotifications || false,
        darkMode: user.darkMode || false,
        autoSave: user.autoSave || false,
      });
    }
  }, [user]);

  // Mutation para atualizar perfil
  const updateUserMutation = useMutation({
    mutationFn: async (data: any) => {
      await updateUserProfile(data);
    },
    onSuccess: () => {
      toast({
        title: "Configurações salvas",
        description: "Suas configurações foram atualizadas com sucesso!",
      });

      // Marcar como visitado se tiver informações básicas
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

  // Mutation para alterar senha com Firebase
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      await changePassword(data.currentPassword, data.newPassword);
    },
    onSuccess: () => {
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({
        title: "Senha alterada!",
        description: "Sua senha foi alterada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar senha",
        description: error?.message || "Não foi possível alterar a senha. Verifique a senha atual.",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = () => {
    if (!formData.firstName || !formData.lastName) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e sobrenome são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    updateUserMutation.mutate(formData);
  };

  const handleChangePassword = () => {
    // Validações
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Todos os campos de senha são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      toast({
        title: "Senha inválida",
        description: "A nova senha deve ser diferente da atual.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <BackButton />
          <div className="flex items-center gap-4">
            <InstallButton />
          </div>
        </div>

        <div className="grid gap-6">
          {/* Informações do Plano */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <CardTitle>Plano Atual</CardTitle>
                </div>
                <Badge variant={user?.plan === 'premium' ? 'default' : 'secondary'}>
                  {user?.plan === 'premium' ? 'Premium' : 'Gratuito'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                {user?.plan === 'premium' 
                  ? 'Você tem acesso a todos os recursos premium!' 
                  : 'Faça upgrade para acessar recursos avançados.'}
              </p>
            </CardContent>
          </Card>

          {/* Informações Pessoais */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <CardTitle>Informações Pessoais</CardTitle>
              </div>
              <CardDescription>
                Configure suas informações básicas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Nome *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Sobrenome *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Seu sobrenome"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
                  <Input
                    id="cpfCnpj"
                    value={formData.cpfCnpj}
                    onChange={(e) => handleInputChange('cpfCnpj', formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', formatPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="profession">Profissão</Label>
                <Input
                  id="profession"
                  value={formData.profession}
                  onChange={(e) => handleInputChange('profession', e.target.value)}
                  placeholder="Sua profissão"
                />
              </div>
            </CardContent>
          </Card>

          {/* Informações da Empresa */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                <CardTitle>Informações da Empresa</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Nome da Empresa</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  placeholder="Nome da sua empresa"
                />
              </div>

              <div>
                <Label htmlFor="address">Endereço</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Endereço completo"
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => handleInputChange('cep', formatCEP(e.target.value))}
                    placeholder="00000-000"
                  />
                </div>
                <div>
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => handleInputChange('cidade', e.target.value)}
                    placeholder="Cidade"
                  />
                </div>
                <div>
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => handleInputChange('estado', e.target.value)}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="pixKey">Chave PIX</Label>
                <Input
                  id="pixKey"
                  value={formData.pixKey}
                  onChange={(e) => handleInputChange('pixKey', e.target.value)}
                  placeholder="Sua chave PIX para recebimentos"
                />
              </div>
            </CardContent>
          </Card>

          {/* Alteração de Senha */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                <CardTitle>Alterar Senha</CardTitle>
              </div>
              <CardDescription>
                Configure uma nova senha para sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Senha Atual *</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Digite sua senha atual"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="newPassword">Nova Senha *</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Digite sua nova senha (mín. 6 caracteres)"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar Nova Senha *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirme sua nova senha"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={changePasswordMutation.isPending}
                className="w-full"
              >
                {changePasswordMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Alterando senha...
                  </div>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Alterar Senha
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Notificações */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <CardTitle>Notificações</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications">Notificações Gerais</Label>
                  <p className="text-sm text-gray-600">Receba notificações sobre atualizações</p>
                </div>
                <Switch
                  id="notifications"
                  checked={formData.notifications}
                  onCheckedChange={(checked) => handleInputChange('notifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailNotifications">Notificações por E-mail</Label>
                  <p className="text-sm text-gray-600">Receba e-mails sobre orçamentos</p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={formData.emailNotifications}
                  onCheckedChange={(checked) => handleInputChange('emailNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="whatsappNotifications">Notificações WhatsApp</Label>
                  <p className="text-sm text-gray-600">Receba atualizações via WhatsApp</p>
                </div>
                <Switch
                  id="whatsappNotifications"
                  checked={formData.whatsappNotifications}
                  onCheckedChange={(checked) => handleInputChange('whatsappNotifications', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Botão Salvar */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveProfile}
              disabled={updateUserMutation.isPending}
              size="lg"
            >
              {updateUserMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </div>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}