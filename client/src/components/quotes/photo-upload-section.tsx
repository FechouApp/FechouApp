import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Camera, Upload, X, Eye, AlertCircle, 
  Crown, Image as ImageIcon 
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface PhotoUploadSectionProps {
  attachments: File[];
  onAttachmentsChange: (files: File[]) => void;
  disabled?: boolean;
}

export default function PhotoUploadSection({ 
  attachments, 
  onAttachmentsChange, 
  disabled = false 
}: PhotoUploadSectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const isPremium = user?.plan === "PREMIUM" || user?.plan === "PREMIUM_CORTESIA";
  const maxFiles = 5;
  const maxFileSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (!isPremium) {
      toast({
        title: "Recurso Premium",
        description: "Upload de fotos está disponível apenas para usuários Premium.",
        variant: "destructive",
      });
      return;
    }

    if (attachments.length + files.length > maxFiles) {
      toast({
        title: "Limite excedido",
        description: `Máximo de ${maxFiles} fotos por orçamento.`,
        variant: "destructive",
      });
      return;
    }

    const validFiles: File[] = [];
    
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Formato inválido",
          description: `${file.name} não é um formato de imagem válido.`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > maxFileSize) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} é maior que 5MB.`,
          variant: "destructive",
        });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onAttachmentsChange([...attachments, ...validFiles]);
      toast({
        title: "Fotos adicionadas",
        description: `${validFiles.length} foto(s) adicionada(s) com sucesso.`,
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(newAttachments);
    
    toast({
      title: "Foto removida",
      description: "A foto foi removida do orçamento.",
    });
  };

  const openPreview = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewImage(url);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }
    setPreviewImage(null);
    setIsPreviewOpen(false);
  };

  const openFileDialog = () => {
    if (!isPremium) {
      toast({
        title: "Recurso Premium",
        description: "Upload de fotos está disponível apenas para usuários Premium.",
        variant: "destructive",
      });
      return;
    }
    
    fileInputRef.current?.click();
  };

  return (
    <>
      <Card className={`${!isPremium ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200' : 'bg-white'} transition-all`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className={`w-5 h-5 ${isPremium ? 'text-blue-600' : 'text-amber-600'}`} />
              <CardTitle className="text-lg flex items-center gap-2">
                Fotos / Anexos
                {!isPremium && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </CardTitle>
              {attachments.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {attachments.length}/{maxFiles}
                </Badge>
              )}
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={openFileDialog}
              disabled={disabled || !isPremium || attachments.length >= maxFiles}
              className={isPremium ? "border-blue-200 hover:bg-blue-50" : "border-amber-200"}
            >
              <Upload className="w-4 h-4 mr-1" />
              Adicionar Fotos
            </Button>
          </div>
          
          {!isPremium && (
            <div className="flex items-center gap-2 text-amber-700 text-sm mt-2">
              <AlertCircle className="w-4 h-4" />
              Adicione fotos ao seu orçamento com o plano Premium
            </div>
          )}
        </CardHeader>
        
        <CardContent className="pt-0">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {attachments.length === 0 ? (
            <div className={`text-center py-8 ${isPremium ? 'text-gray-500' : 'text-amber-600'}`}>
              <ImageIcon className={`w-12 h-12 mx-auto mb-2 ${isPremium ? 'text-gray-300' : 'text-amber-300'}`} />
              <p className="font-medium">
                {isPremium ? "Nenhuma foto adicionada" : "Recurso Premium"}
              </p>
              <p className="text-sm">
                {isPremium 
                  ? "Clique em 'Adicionar Fotos' para começar" 
                  : "Faça upgrade para adicionar fotos aos seus orçamentos"
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {attachments.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-300 transition-colors">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                      onLoad={(e) => {
                        // Clean up object URL after image loads
                        setTimeout(() => {
                          URL.revokeObjectURL((e.target as HTMLImageElement).src);
                        }, 1000);
                      }}
                    />
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPreview(file)}
                          className="bg-white text-black hover:bg-gray-100"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="bg-red-500 text-white hover:bg-red-600 border-red-500"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* File info */}
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Visualizar Foto</DialogTitle>
            <DialogDescription>
              Visualização da imagem anexada ao orçamento
            </DialogDescription>
          </DialogHeader>
          
          {previewImage && (
            <div className="flex items-center justify-center">
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                onLoad={() => {
                  // Keep URL alive while dialog is open
                }}
              />
            </div>
          )}
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={closePreview}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}