import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import fechouLogo from "@assets/Imagem do WhatsApp de 2025-06-02 à(s) 10.57.31_271fccf2.jpg";

interface FixedHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backTo?: string;
}

export default function FixedHeader({ 
  title, 
  subtitle, 
  showBackButton = false, 
  backTo = "/" 
}: FixedHeaderProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-50 border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo e Navegação */}
          <div className="flex items-center space-x-4">
            <img 
              src={fechouLogo} 
              alt="Fechou!" 
              className="h-8 w-auto"
            />
            
            {/* Botões de Navegação */}
            <div className="flex items-center space-x-2">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation(backTo)}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <Home className="w-4 h-4" />
                Início
              </Button>
            </div>
          </div>

          {/* Título e Subtítulo */}
          {title && (
            <div className="flex-1 text-center">
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-600">{subtitle}</p>
              )}
            </div>
          )}

          {/* Espaço para manter o layout equilibrado */}
          <div className="w-32"></div>
        </div>
      </div>
    </div>
  );
}