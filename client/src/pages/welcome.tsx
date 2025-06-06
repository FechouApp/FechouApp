
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, FileText, Users, Star, ArrowRight } from "lucide-react";

export default function Welcome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (user) {
      setIsVisible(true);
    }
  }, [user]);

  const handleStartRegistration = () => {
    console.log('Botão Começar Cadastro clicado');
    localStorage.setItem('fechou_has_visited', 'true');
    setLocation('/settings');
  };

  const handleSkip = () => {
    console.log('Botão Pular por agora clicado');
    localStorage.setItem('fechou_has_visited', 'true');
    setLocation('/');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-8 text-center">
          {/* Logo and Welcome */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              Bem-vindo ao Fechou!
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              O jeito moderno de fechar negócios
            </p>
            <p className="text-gray-500">
              Crie, envie e gerencie orçamentos profissionais com facilidade
            </p>
          </div>

          {/* Features Preview */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Orçamentos Profissionais</h3>
              <p className="text-sm text-gray-600">
                Crie orçamentos elegantes e personalizados
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Gestão de Clientes</h3>
              <p className="text-sm text-gray-600">
                Organize todos os seus clientes em um só lugar
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold mb-2">Avaliações</h3>
              <p className="text-sm text-gray-600">
                Receba feedback e construa sua reputação
              </p>
            </div>
          </div>

          {/* Getting Started */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold mb-3">Vamos começar!</h3>
            <p className="text-gray-600 mb-4">
              Para aproveitar ao máximo o Fechou!, vamos configurar algumas informações básicas sobre você e seu negócio.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <span>Leva apenas 2 minutos</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleStartRegistration}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 text-lg font-semibold hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              Começar Cadastro
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <button 
              onClick={handleSkip}
              className="px-8 py-3 text-lg border-2 border-gray-300 hover:bg-gray-50 rounded-lg transition-all duration-200 bg-white text-gray-700"
            >
              Pular por agora
            </button>
          </div>

          {/* Note */}
          <p className="text-xs text-gray-400 mt-6">
            Você pode configurar essas informações a qualquer momento nas configurações
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
