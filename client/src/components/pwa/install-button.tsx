import { Button } from '@/components/ui/button';
import { Download, Check, Smartphone } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { useToast } from '@/hooks/use-toast';

interface InstallButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
}

export default function InstallButton({ variant = "outline", size = "default", className = "" }: InstallButtonProps) {
  const { canInstall, installApp, isInstalled, showIOSInstructions } = usePWA();
  const { toast } = useToast();

  if (isInstalled) {
    return (
      <Button 
        variant={variant} 
        size={size} 
        className={`${className} cursor-default`}
        disabled
      >
        <Check className="w-4 h-4 mr-2" />
        App Instalado
      </Button>
    );
  }

  if (!canInstall() && !showIOSInstructions()) {
    return null;
  }

  const handleInstall = async () => {
    if (showIOSInstructions()) {
      toast({
        title: "Instalar no iPhone/iPad",
        description: "Toque no botão de compartilhar no Safari e selecione 'Adicionar à Tela de Início'",
        duration: 6000,
      });
      return;
    }

    const success = await installApp();
    if (success) {
      toast({
        title: "App instalado com sucesso!",
        description: "O Fechou! está agora disponível na sua tela inicial",
      });
    }
  };

  return (
    <Button 
      onClick={handleInstall}
      variant={variant} 
      size={size} 
      className={className}
    >
      {showIOSInstructions() ? (
        <>
          <Smartphone className="w-4 h-4 mr-2" />
          Adicionar à Tela Inicial
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Instalar App
        </>
      )}
    </Button>
  );
}