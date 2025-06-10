import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useEffect } from "react";
import { generateReceiptPDF, downloadPDF } from "@/lib/pdfGenerator";
import LoadingSpinner from "@/components/common/loading-spinner";

export default function PublicReceiptPDF() {
  const { quoteNumber } = useParams();

  const { data: quote, isLoading, error } = useQuery({
    queryKey: [`/api/public-quotes/${quoteNumber}/receipt`],
    enabled: !!quoteNumber,
  }) as { data: any, isLoading: boolean, error: any };

  // Fetch user data
  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: [`/api/public-users/${quote?.userId}`],
    enabled: !!quote?.userId,
  }) as { data: any, isLoading: boolean, error: any };

  useEffect(() => {
    const generateAndDownloadPDF = async () => {
      if (!quote || !user || quote.status !== 'paid') return;

      try {
        console.log('Generating public receipt PDF...', { quoteNumber });

        const pdfBlob = await generateReceiptPDF({
          quote,
          user,
          isUserPremium: user.plan === 'PREMIUM'
        });

        console.log('Public receipt PDF generated successfully');
        downloadPDF(pdfBlob, `Recibo_${quote.quoteNumber}.pdf`);
      } catch (error) {
        console.error('Error generating public receipt PDF:', error);
        // Show error message to user
        document.body.innerHTML = `
          <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
            <div style="text-align: center; color: #dc2626;">
              <h2>Erro ao gerar recibo</h2>
              <p>Não foi possível gerar o PDF do recibo.</p>
            </div>
          </div>
        `;
      }
    };

    if (quote && user && !isLoading && !userLoading) {
      generateAndDownloadPDF();
    }
  }, [quote, user, isLoading, userLoading, quoteNumber]);

  if (isLoading || userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Gerando recibo...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Recibo não encontrado</h2>
          <p className="text-gray-600">O recibo que você está procurando não existe ou não está disponível.</p>
        </div>
      </div>
    );
  }

  if (quote.status !== 'paid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-yellow-600 mb-2">Recibo não disponível</h2>
          <p className="text-gray-600">O recibo só está disponível para orçamentos pagos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">Preparando download do recibo...</p>
      </div>
    </div>
  );
}