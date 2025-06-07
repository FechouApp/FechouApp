import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
}

export default function BackButton({ to = "/", label = "Voltar", className = "" }: BackButtonProps) {
  const [, setLocation] = useLocation();

  return (
    <div className={`flex items-center mb-6 ${className}`}>
      <Button
        variant="ghost"
        onClick={() => setLocation(to)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        {label}
      </Button>
    </div>
  );
}