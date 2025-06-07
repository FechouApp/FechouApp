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
import { User, Building, Bell, Crown, Mail, Phone, MapPin, Save, Upload, Lock, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPhone, formatCPF, formatCEP } from "@/lib/utils";
import type { User as UserType } from "@/types";
import ReferralPanel from "@/components/referrals/referral-panel";

export default function Settings() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const typedUser = user as UserType;
  const [activeTab, setActiveTab] = useState("personal");

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
    primaryColor: "#3B82F6",
    secondaryColor: "#10B981",
    whatsappNotifications: false,
    emailNotifications: true,
  });

  // Update formData when user is available
  useEffect(() => {
    if (typedUser) {
      setFormData({
        firstName: typedUser.firstName || "",
        lastName: typedUser.lastName || "",
        cpfCnpj: typedUser.cpfCnpj || "",
        profession: typedUser.profession || "",
        businessName: typedUser.businessName || "",
        phone: typedUser.phone || "",
        address: typedUser.address || "",
        cep: "",
        numero: "",
        complemento: "",
        cidade: "",
        estado: "",
        pixKey: typedUser.pixKey || "",
        logoUrl: typedUser.logoUrl || "",
        profileImageUrl: typedUser.profileImageUrl || "",
        primaryColor: typedUser.primaryColor || "#3B82F6",
        secondaryColor: typedUser.secondaryColor || "#10B981",
        whatsappNotifications: typedUser.whatsappNotifications ?? true,
        emailNotifications: typedUser.emailNotifications ?? true,
      });
    }
  }, [typedUser]);

  const updateUserMutation = useMutation({
    mutationFn: (userData: any) => apiRequest("PUT", "/api/auth/user", userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Sucesso",
        description: "Informações atualizadas com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao atualizar informações.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserMutation.mutate(formData);
  };

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

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        <button
          onClick={() => setActiveTab("personal")}
          className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
            activeTab === "personal"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <User className="w-4 h-4" />
          <span className="hidden sm:inline">Pessoal</span>
        </button>
        <button
          onClick={() => setActiveTab("business")}
          className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
            activeTab === "business"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Building className="w-4 h-4" />
          <span className="hidden sm:inline">Negócio</span>
        </button>
        <button
          onClick={() => setActiveTab("referrals")}
          className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
            activeTab === "referrals"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Indicações</span>
        </button>
        <button
          onClick={() => setActiveTab("notifications")}
          className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
            activeTab === "notifications"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span className="hidden sm:inline">Notificações</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "referrals" && <ReferralPanel />}
        
        {activeTab === "personal" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={updateUserMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateUserMutation.isPending ? "Salvando..." : "Salvar Informações"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "business" && (
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
                  <Label htmlFor="businessName">Nome do Negócio</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange("businessName", e.target.value)}
                    placeholder="Nome da sua empresa ou negócio"
                  />
                </div>

                <div>
                  <Label htmlFor="pixKey">Chave PIX</Label>
                  <Input
                    id="pixKey"
                    value={formData.pixKey}
                    onChange={(e) => handleInputChange("pixKey", e.target.value)}
                    placeholder="Sua chave PIX para recebimentos"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={updateUserMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateUserMutation.isPending ? "Salvando..." : "Salvar Informações"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "notifications" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por WhatsApp</Label>
                  <p className="text-sm text-gray-500">
                    Receba notificações sobre orçamentos por WhatsApp
                  </p>
                </div>
                <Switch
                  checked={formData.whatsappNotifications}
                  onCheckedChange={(checked) => handleInputChange("whatsappNotifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por Email</Label>
                  <p className="text-sm text-gray-500">
                    Receba notificações sobre orçamentos por email
                  </p>
                </div>
                <Switch
                  checked={formData.emailNotifications}
                  onCheckedChange={(checked) => handleInputChange("emailNotifications", checked)}
                />
              </div>

              <Button 
                onClick={() => updateUserMutation.mutate(formData)}
                disabled={updateUserMutation.isPending}
                className="w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateUserMutation.isPending ? "Salvando..." : "Salvar Preferências"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Account Actions - Show on all tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Ações da Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "/api/logout"}
              className="w-full sm:w-auto"
            >
              Sair da Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}