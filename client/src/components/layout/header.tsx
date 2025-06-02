import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { useLocation } from "wouter";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backTo?: string;
}

export default function Header({ 
  title, 
  subtitle, 
  showBackButton = true, 
  backTo = "/" 
}: HeaderProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    setLocation(backTo);
  };

  const handleHome = () => {
    setLocation("/");
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        {/* Logo e navegação */}
        <div className="flex items-center gap-3">
          {backTo !== "/" && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleHome}
              className="text-blue-600 hover:text-blue-800 font-bold text-lg"
            >
              <Home className="w-5 h-5 mr-2" />
              Fechou!
            </Button>
          )}
          
          {backTo === "/" && (
            <div className="text-blue-600 font-bold text-lg flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Fechou!
            </div>
          )}
          
          {showBackButton && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
        </div>
        
        {title && (
          <div className="hidden sm:block">
            <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
            {subtitle && <p className="text-gray-600">{subtitle}</p>}
          </div>
        )}
      </div>
      
      {/* Título mobile */}
      {title && (
        <div className="sm:hidden flex-1 text-center">
          <h1 className="text-lg font-bold text-gray-800">{title}</h1>
        </div>
      )}
    </div>
  );
}