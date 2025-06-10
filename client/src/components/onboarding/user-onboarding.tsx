import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronLeft, Check, Building2, User, Phone, Mail, MapPin, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface OnboardingData {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  phone: string;
}

interface UserOnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    id: 1,
    title: "Bem-vindo ao Fechou!",
    subtitle: "Vamos configurar seu perfil para personalizar seus orçamentos",
    icon: Building2,
    fields: []
  },
  {
    id: 2,
    title: "Seus Dados",
    subtitle: "Como você gostaria de aparecer nos orçamentos?",
    icon: User,
    fields: ['firstName', 'lastName', 'businessName']
  },
  {
    id: 3,
    title: "Contato",
    subtitle: "Como seus clientes podem te encontrar?",
    icon: Phone,
    fields: ['email', 'phone']
  },
  {
    id: 4,
    title: "Tudo Pronto!",
    subtitle: "Suas informações foram salvas com sucesso",
    icon: Check,
    fields: []
  }
];

export default function UserOnboarding({ onComplete }: UserOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    firstName: "",
    lastName: "",
    businessName: "",
    email: "",
    phone: ""
  });
  const { toast } = useToast();

  const saveUserDataMutation = useMutation({
    mutationFn: (userData: OnboardingData) => 
      apiRequest("POST", "/api/user/profile", userData),
    onSuccess: () => {
      toast({
        title: "Perfil configurado!",
        description: "Suas informações foram salvas com sucesso.",
      });
      // Don't call onComplete here, let handleNext do it
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao salvar informações.",
        variant: "destructive",
      });
    },
  });

  const updateData = (field: keyof OnboardingData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = async () => {
    if (currentStep === 3) {
      // Save data on step 3 (last data collection step)
      try {
        await saveUserDataMutation.mutateAsync(data);
        setCurrentStep(4);
      } catch (error) {
        // Error is handled by mutation onError
        return;
      }
    } else if (currentStep === 4) {
      // Final step - complete onboarding
      onComplete();
    } else if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const isStepValid = () => {
    const currentStepData = steps.find(s => s.id === currentStep);
    if (!currentStepData || currentStepData.fields.length === 0) return true;
    
    return currentStepData.fields.every(field => 
      data[field as keyof OnboardingData].trim() !== ""
    );
  };

  const getCurrentStep = () => steps.find(s => s.id === currentStep)!;
  const progress = (currentStep - 1) / (steps.length - 1) * 100;

  const renderStepContent = () => {
    const step = getCurrentStep();
    const Icon = step.icon;

    if (currentStep === 1) {
      return (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{step.title}</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {step.subtitle}
          </p>
          <div className="bg-blue-50 p-4 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-blue-800">
              Essas informações aparecerão nos seus orçamentos e ajudarão seus clientes a te conhecer melhor.
            </p>
          </div>
        </div>
      );
    }

    if (currentStep === 6) {
      return (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{step.title}</h2>
          <p className="text-gray-600 mb-8">
            Agora você pode começar a criar seus primeiros orçamentos!
          </p>
        </div>
      );
    }

    return (
      <div className="py-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h2>
          <p className="text-gray-600">{step.subtitle}</p>
        </div>

        <div className="space-y-4 max-w-md mx-auto">
          {currentStep === 2 && (
            <>
              <div>
                <Label htmlFor="firstName">Nome *</Label>
                <Input
                  id="firstName"
                  value={data.firstName}
                  onChange={(e) => updateData('firstName', e.target.value)}
                  placeholder="Seu primeiro nome"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Sobrenome *</Label>
                <Input
                  id="lastName"
                  value={data.lastName}
                  onChange={(e) => updateData('lastName', e.target.value)}
                  placeholder="Seu sobrenome"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="businessName">Nome da Empresa *</Label>
                <Input
                  id="businessName"
                  value={data.businessName}
                  onChange={(e) => updateData('businessName', e.target.value)}
                  placeholder="Nome do seu negócio"
                  className="mt-1"
                />
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={data.email}
                  onChange={(e) => updateData('email', e.target.value)}
                  placeholder="seu@email.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={data.phone}
                  onChange={(e) => updateData('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="mt-1"
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center border-b">
          <div className="mb-4">
            <Progress value={progress} className="w-full h-2" />
          </div>
          <div className="text-sm text-gray-500">
            Passo {currentStep} de {steps.length}
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {renderStepContent()}
        </CardContent>

        <div className="flex justify-between p-6 border-t bg-gray-50">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </Button>
            
            {currentStep !== 4 && (
              <Button
                variant="ghost"
                onClick={onComplete}
                className="text-gray-600 hover:text-gray-800"
              >
                Pular configuração
              </Button>
            )}
          </div>

          <Button
            onClick={handleNext}
            disabled={!isStepValid() || saveUserDataMutation.isPending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {currentStep === 1 ? "Iniciar" : 
             currentStep === 4 ? "Finalizar" : 
             currentStep === 3 ? "Salvar" : "Próximo"}
            {currentStep < 4 && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}