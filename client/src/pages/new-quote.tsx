import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import LoadingSpinner from "@/components/common/loading-spinner";
import QuoteForm from "@/components/quotes/quote-form";
import QuickSetup from "@/components/quick-setup";
import Header from "@/components/layout/header";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Eye, Send } from "lucide-react";
import type { Client, CreateQuoteRequest, QuoteWithDetails } from "@/types";

export default function NewQuote() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  
  // Extract quote ID from URL for editing
  const quoteId = location.includes('/edit') ? location.split('/')[2] : null;
  const isEditing = !!quoteId;

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    retry: false,
  });

  // Load quote data for editing
  const { data: quoteData, isLoading: quoteLoading } = useQuery<QuoteWithDetails>({
    queryKey: ["/api/quotes", quoteId],
    enabled: !!quoteId,
    retry: false,
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (quoteData: CreateQuoteRequest) => {
      await apiRequest("POST", "/api/quotes", quoteData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Sucesso",
        description: "Orçamento criado com sucesso!",
      });
      setLocation("/quotes");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao criar orçamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleBack = () => {
    setLocation("/quotes");
  };

  if (authLoading || clientsLoading || (isEditing && quoteLoading)) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <Header 
        title={isEditing ? "Editar Orçamento" : "Novo Orçamento"}
        subtitle={isEditing ? "Edite os dados do seu orçamento" : "Crie um novo orçamento para seu cliente"}
        backTo="/quotes"
      />

      <div className="max-w-5xl">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1 ? 'bg-white text-brand-primary' : 'bg-white/20 text-white/60'
            }`}>
              1
            </div>
            <div className={`w-16 h-1 ${step > 1 ? 'bg-white' : 'bg-white/20'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 2 ? 'bg-white text-brand-primary' : 'bg-white/20 text-white/60'
            }`}>
              2
            </div>
            <div className={`w-16 h-1 ${step > 2 ? 'bg-white' : 'bg-white/20'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 3 ? 'bg-white text-brand-primary' : 'bg-white/20 text-white/60'
            }`}>
              3
            </div>
          </div>
        </div>

        {/* Show quick setup if no clients */}
        {(!clients || clients.length === 0) && (
          <div className="mb-8">
            <QuickSetup />
          </div>
        )}

        {/* Quote Form */}
        <QuoteForm
          clients={clients || []}
          onSubmit={(data) => createQuoteMutation.mutate(data)}
          isSubmitting={createQuoteMutation.isPending}
          step={step}
          onStepChange={setStep}
        />
      </div>
    </div>
  );
}
