import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, FileText, Users, Star, Crown, ArrowRight } from "lucide-react";
import Logo from "@/components/ui/logo";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Logo size="lg" className="text-white" showSlogan={true} />
          </div>
          <p className="text-white/90 text-xl max-w-2xl mx-auto">
            Crie, envie e gerencie orçamentos profissionais com facilidade. 
            Aumente suas vendas e impressione seus clientes.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="card-hover">
            <CardContent className="p-6 text-center">
              <FileText className="w-12 h-12 text-brand-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Orçamentos Profissionais</h3>
              <p className="text-gray-600">
                Crie orçamentos elegantes e personalizados que impressionam seus clientes
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 text-brand-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Gestão de Clientes</h3>
              <p className="text-gray-600">
                Organize todos os seus clientes e mantenha um histórico completo
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-6 text-center">
              <Star className="w-12 h-12 text-brand-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Avaliações</h3>
              <p className="text-gray-600">
                Receba feedback dos clientes e construa sua reputação profissional
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Plans Preview */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Plano Gratuito</h3>
              <div className="text-4xl font-bold text-gray-800 mb-4">R$ 0</div>
              <p className="text-gray-600 mb-6">Para sempre</p>
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Até 5 orçamentos por mês</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Envio via WhatsApp</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Gerenciamento básico</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full" onClick={handleLogin}>
                Começar Grátis
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-brand-primary relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-brand-primary text-white px-6 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Recomendado
              </span>
            </div>
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Plano Premium</h3>
              <div className="text-4xl font-bold text-brand-primary mb-4">R$ 29</div>
              <p className="text-gray-600 mb-6">por mês</p>
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium">Orçamentos ilimitados</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium">Envio por WhatsApp e e-mail</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium">Logotipo personalizado</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium">Emissão de recibo</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium">Relatórios estatísticos</span>
                </li>
              </ul>
              <Button 
                className="w-full brand-gradient text-white"
                onClick={() => window.open("https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=2c9380849763dae001976518e1ce0072", "_blank")}
              >
                ATIVE AGORA
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Instructions Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 mb-12 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-white mb-4 text-center">
            Como começar a usar o Fechou!
          </h3>
          <div className="grid md:grid-cols-3 gap-6 text-white/90">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-white">1</span>
              </div>
              <h4 className="font-semibold mb-2">Criar conta</h4>
              <p className="text-sm">
                Clique em "Começar Agora" e você será redirecionado para criar uma conta gratuita no Replit
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-white">2</span>
              </div>
              <h4 className="font-semibold mb-2">Fazer login</h4>
              <p className="text-sm">
                Após criar sua conta, faça login e você será automaticamente direcionado para o Fechou!
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-white">3</span>
              </div>
              <h4 className="font-semibold mb-2">Começar a usar</h4>
              <p className="text-sm">
                Configure seus dados nas configurações e comece a criar orçamentos profissionais
              </p>
            </div>
          </div>
          <div className="mt-6 p-4 bg-white/10 rounded-lg">
            <p className="text-white/80 text-sm text-center">
              <strong>Importante:</strong> As páginas de login e cadastro do Replit estão em inglês, 
              mas não se preocupe - é muito simples! Você precisará apenas criar um usuário e senha.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para revolucionar seus orçamentos?
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de profissionais que já transformaram seus negócios com o Fechou!
          </p>
          <Button 
            size="lg" 
            className="brand-gradient text-white text-lg px-8 py-4 h-auto"
            onClick={handleLogin}
          >
            Começar Agora
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
