import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Download, Share, Plus } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { useToast } from '@/hooks/use-toast';

export default function InstallPrompt() {
  const [isDismissed, setIsDismissed] = useState(false);
  const { canInstall, installApp, showIOSInstructions, isIOSDevice } = usePWA();
  const { toast } = useToast();

  if (isDismissed || (!canInstall() && !showIOSInstructions())) {
    return null;
  }

  const handleInstall = async () => {
    if (showIOSInstructions()) {
      // Mostra instruções para iOS
      toast({
        title: "Instalar no iPhone/iPad",
        description: "Toque no ícone de compartilhar e selecione 'Adicionar à Tela de Início'",
        duration: 5000,
      });
      return;
    }

    const success = await installApp();
    if (success) {
      toast({
        title: "App instalado!",
        description: "O Fechou! foi adicionado à sua tela inicial",
      });
    } else {
      toast({
        title: "Instalação cancelada",
        description: "Você pode instalar o app a qualquer momento",
        variant: "destructive"
      });
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 shadow-lg border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Download className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Instalar Fechou!</h3>
              <Badge variant="secondary" className="text-xs">
                PWA
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-sm text-gray-600 mb-3">
          {showIOSInstructions() 
            ? "Adicione o Fechou! à sua tela inicial para acesso rápido" 
            : "Instale o app para acesso offline e melhor experiência"
          }
        </p>

        {showIOSInstructions() ? (
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Share className="w-3 h-3" />
              <span>Toque no ícone de compartilhar</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Plus className="w-3 h-3" />
              <span>Selecione "Adicionar à Tela de Início"</span>
            </div>
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button
            onClick={handleInstall}
            size="sm"
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {showIOSInstructions() ? "Ver instruções" : "Instalar App"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
          >
            Depois
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}