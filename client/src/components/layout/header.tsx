import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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

  return (
    <div className="flex items-center gap-4 mb-6">
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
      {title && (
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          {subtitle && <p className="text-gray-600">{subtitle}</p>}
        </div>
      )}
    </div>
  );
}