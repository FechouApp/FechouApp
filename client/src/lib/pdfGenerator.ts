import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { QuoteWithDetails, User } from '@/types';

interface PDFGeneratorOptions {
  quote: QuoteWithDetails;
  user: User;
  isPaidPlan: boolean;
}

export async function generateQuotePDF({ quote, user, isPaidPlan }: PDFGeneratorOptions): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  let yPosition = 25;

  // Cabeçalho com informações do profissional
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(user.businessName || `${user.firstName} ${user.lastName}`.trim(), 20, yPosition);
  yPosition += 10;

  // Informações do profissional
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (user.email) {
    doc.text(`Email: ${user.email}`, 20, yPosition);
    yPosition += 5;
  }
  if (user.profession) {
    doc.text(`Profissão: ${user.profession}`, 20, yPosition);
    yPosition += 5;
  }

  yPosition += 15;

  // Título do orçamento centralizado
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Linha decorativa
  doc.setDrawColor(66, 126, 234);
  doc.setLineWidth(0.5);
  doc.line(60, yPosition, pageWidth - 60, yPosition);
  yPosition += 8;

  // Número do orçamento e data centralizados
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nº ${quote.quoteNumber} | ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Linha decorativa
  doc.line(60, yPosition, pageWidth - 60, yPosition);
  yPosition += 15;

  // Caixa de informações do cliente
  doc.setFillColor(245, 247, 250); // Cinza claro
  doc.rect(20, yPosition - 3, pageWidth - 40, 45, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, yPosition - 3, pageWidth - 40, 45);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(66, 126, 234); // Azul
  doc.text('👤 DADOS DO CLIENTE', 25, yPosition + 5);
  doc.setTextColor(0, 0, 0); // Voltar para preto
  yPosition += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${quote.client.name}`, 25, yPosition);
  yPosition += 6;
  
  if (quote.client.email) {
    doc.text(`Email: ${quote.client.email}`, 25, yPosition);
    yPosition += 6;
  }
  
  if (quote.client.phone) {
    doc.text(`Telefone: ${quote.client.phone}`, 25, yPosition);
    yPosition += 6;
  }

  if (quote.client.address) {
    const address = `${quote.client.address}${quote.client.number ? `, ${quote.client.number}` : ''}${quote.client.complement ? `, ${quote.client.complement}` : ''}`;
    doc.text(`Endereço: ${address}`, 25, yPosition);
    yPosition += 6;
    
    if (quote.client.city && quote.client.state) {
      doc.text(`${quote.client.city} - ${quote.client.state}`, 25, yPosition);
      yPosition += 6;
    }
  }

  yPosition += 15;

  // Título do orçamento
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Título: ${quote.title}`, 20, yPosition);
  yPosition += 10;

  // Descrição
  if (quote.description) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Descrição:', 20, yPosition);
    yPosition += 6;
    
    const splitDescription = doc.splitTextToSize(quote.description, pageWidth - 40);
    doc.text(splitDescription, 20, yPosition);
    yPosition += splitDescription.length * 5 + 10;
  }

  // Seção de serviços com caixa
  doc.setFillColor(250, 252, 255); // Azul muito claro
  const servicesBoxHeight = (quote.items.length * 8) + 25;
  doc.rect(20, yPosition - 3, pageWidth - 40, servicesBoxHeight, 'F');
  doc.setDrawColor(66, 126, 234);
  doc.rect(20, yPosition - 3, pageWidth - 40, servicesBoxHeight);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(66, 126, 234);
  doc.text('🛠 SERVIÇOS', 25, yPosition + 5);
  doc.setTextColor(0, 0, 0);
  yPosition += 15;

  // Cabeçalho da tabela melhorado
  doc.setFillColor(66, 126, 234);
  doc.rect(25, yPosition - 2, pageWidth - 50, 8, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Descrição', 30, yPosition + 3);
  doc.text('Qtd', 125, yPosition + 3, { align: 'center' });
  doc.text('Valor Unit.', 150, yPosition + 3, { align: 'right' });
  doc.text('Total', 170, yPosition + 3, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  yPosition += 10;

  // Itens da tabela com formatação melhorada
  doc.setFont('helvetica', 'normal');
  quote.items.forEach((item, index) => {
    // Verificar se precisa de nova página
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 20;
    }

    // Linha alternada para melhor visualização
    if (index % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(25, yPosition - 2, pageWidth - 50, 8, 'F');
    }

    const description = doc.splitTextToSize(item.description, 85);
    doc.text(description, 30, yPosition + 3);
    doc.text(item.quantity.toString(), 125, yPosition + 3, { align: 'center' });
    
    // Formatação de valores com separador de milhar
    const unitPrice = parseFloat(item.unitPrice);
    const total = parseFloat(item.total);
    doc.text(`R$ ${unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 150, yPosition + 3, { align: 'right' });
    doc.text(`R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 170, yPosition + 3, { align: 'right' });
    
    yPosition += Math.max(description.length * 4, 8);
  });

  yPosition += 10;

  // Totais com destaque
  const subtotal = parseFloat(quote.subtotal);
  const discount = parseFloat(quote.discount);
  const total = parseFloat(quote.total);

  // Caixa de totais
  doc.setFillColor(245, 247, 250);
  doc.rect(pageWidth - 80, yPosition - 5, 75, 25, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(pageWidth - 80, yPosition - 5, 75, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const totalsX = pageWidth - 75;
  doc.text(`Subtotal: R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, totalsX, yPosition);
  yPosition += 6;
  
  if (discount > 0) {
    doc.text(`Desconto: R$ ${discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, totalsX, yPosition);
    yPosition += 6;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(66, 126, 234);
  doc.text(`TOTAL: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, totalsX, yPosition);
  doc.setTextColor(0, 0, 0);
  yPosition += 20;

  // Seção de condições e informações em caixa
  const infoBoxHeight = 50;
  doc.setFillColor(252, 254, 255); // Azul muito claro
  doc.rect(20, yPosition - 3, pageWidth - 40, infoBoxHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, yPosition - 3, pageWidth - 40, infoBoxHeight);

  // Condições de pagamento
  if (quote.paymentTerms) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(66, 126, 234);
    doc.text('💳 Condições de Pagamento:', 25, yPosition + 5);
    doc.setTextColor(0, 0, 0);
    yPosition += 8;
    
    doc.setFont('helvetica', 'normal');
    const splitPayment = doc.splitTextToSize(quote.paymentTerms, pageWidth - 50);
    doc.text(splitPayment, 25, yPosition);
    yPosition += splitPayment.length * 4 + 6;
  }

  // Prazo de execução
  if (quote.executionDeadline) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(66, 126, 234);
    doc.text('🕒 Prazo de Execução:', 25, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.text(quote.executionDeadline, 25, yPosition);
    yPosition += 8;
  }

  // Validade
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(66, 126, 234);
  doc.text('📆 Validade:', 25, yPosition);
  doc.setTextColor(0, 0, 0);
  yPosition += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`até ${format(new Date(quote.validUntil), 'dd/MM/yyyy', { locale: ptBR })}`, 25, yPosition);
  yPosition += 15;

  // Observações
  if (quote.observations) {
    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', 20, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'normal');
    const splitObservations = doc.splitTextToSize(quote.observations, pageWidth - 40);
    doc.text(splitObservations, 20, yPosition);
    yPosition += splitObservations.length * 5 + 10;
  }

  // Marca d'água menor para plano gratuito
  if (!isPaidPlan) {
    doc.setFontSize(24);
    doc.setTextColor(230, 230, 230);
    doc.setFont('helvetica', 'bold');
    
    // Girar texto para diagonal - menor e mais discreta
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    
    doc.text('Fechou!', centerX, centerY, {
      angle: 45,
      align: 'center'
    });
    
    // Voltar cor normal
    doc.setTextColor(0, 0, 0);
  }

  // Rodapé melhorado
  yPosition = pageHeight - 20;
  
  // Linha decorativa no rodapé
  doc.setDrawColor(66, 126, 234);
  doc.setLineWidth(0.3);
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 8;
  
  if (!isPaidPlan) {
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Gerado por Fechou! - Sistema de Orçamentos', pageWidth / 2, yPosition, {
      align: 'center'
    });
    doc.setTextColor(0, 0, 0);
  } else {
    // Para planos pagos, pode incluir informações de contato do profissional
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    if (user.email) {
      doc.text(`Contato: ${user.email}`, pageWidth / 2, yPosition, {
        align: 'center'
      });
    }
    doc.setTextColor(0, 0, 0);
  }

  // Converter para blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function createPDFUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}