
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function NotFound() {
  const { isAuthenticated } = useAuth();

  const goHome = () => {
    if (isAuthenticated) {
      window.location.href = "/";
    } else {
      window.location.href = "/";
    }
  };

  const goBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">404 - Página não encontrada</h1>
            <p className="text-gray-600 mb-6">
              A página que você está procurando não existe ou foi movida.
            </p>
            
            <div className="space-y-3">
              <Button onClick={goHome} className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Ir para o início
              </Button>
              
              <Button onClick={goBack} variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
