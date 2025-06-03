import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { QuoteWithDetails, User } from '@/types';

// Importar jspdf-autotable para adicionar a funcionalidade de tabela
require('jspdf-autotable');

interface PDFGeneratorOptions {
  quote: QuoteWithDetails;
  user: User;
  isPaidPlan: boolean;
}

export async function generateQuotePDF({ quote, user, isPaidPlan }: PDFGeneratorOptions): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  let yPosition = 20;

  // Cabeçalho
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(user.businessName || `${user.firstName} ${user.lastName}`.trim(), 20, yPosition);
  yPosition += 15;

  // Informações do profissional
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (user.email) {
    doc.text(`Email: ${user.email}`, 20, yPosition);
    yPosition += 6;
  }
  if (user.profession) {
    doc.text(`Profissão: ${user.profession}`, 20, yPosition);
    yPosition += 6;
  }

  yPosition += 10;

  // Título do orçamento
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO', 20, yPosition);
  yPosition += 10;

  // Número do orçamento e data
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Orçamento Nº: ${quote.quoteNumber}`, 20, yPosition);
  doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`, pageWidth - 60, yPosition);
  yPosition += 15;

  // Informações do cliente
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${quote.client.name}`, 20, yPosition);
  yPosition += 6;
  
  if (quote.client.email) {
    doc.text(`Email: ${quote.client.email}`, 20, yPosition);
    yPosition += 6;
  }
  
  if (quote.client.phone) {
    doc.text(`Telefone: ${quote.client.phone}`, 20, yPosition);
    yPosition += 6;
  }

  if (quote.client.address) {
    const address = `${quote.client.address}${quote.client.number ? `, ${quote.client.number}` : ''}${quote.client.complement ? `, ${quote.client.complement}` : ''}`;
    doc.text(`Endereço: ${address}`, 20, yPosition);
    yPosition += 6;
    
    if (quote.client.city && quote.client.state) {
      doc.text(`${quote.client.city} - ${quote.client.state}`, 20, yPosition);
      yPosition += 6;
    }
  }

  yPosition += 10;

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

  // Tabela de itens usando uma implementação manual
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ITENS/SERVIÇOS', 20, yPosition);
  yPosition += 10;

  // Cabeçalho da tabela
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Descrição', 20, yPosition);
  doc.text('Qtd', 120, yPosition);
  doc.text('Valor Unit.', 140, yPosition);
  doc.text('Total', 170, yPosition);
  yPosition += 8;

  // Linha de separação
  doc.line(20, yPosition - 2, 190, yPosition - 2);

  // Itens da tabela
  doc.setFont('helvetica', 'normal');
  quote.items.forEach((item) => {
    // Verificar se precisa de nova página
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 20;
    }

    const description = doc.splitTextToSize(item.description, 90);
    doc.text(description, 20, yPosition);
    doc.text(item.quantity.toString(), 120, yPosition);
    doc.text(`R$ ${parseFloat(item.unitPrice).toFixed(2).replace('.', ',')}`, 140, yPosition);
    doc.text(`R$ ${parseFloat(item.total).toFixed(2).replace('.', ',')}`, 170, yPosition);
    
    yPosition += Math.max(description.length * 4, 6) + 2;
  });

  // Linha de separação final
  doc.line(20, yPosition, 190, yPosition);
  yPosition += 10;

  // Totais
  const subtotal = parseFloat(quote.subtotal);
  const discount = parseFloat(quote.discount);
  const total = parseFloat(quote.total);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const totalsX = pageWidth - 70;
  doc.text(`Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}`, totalsX, yPosition);
  yPosition += 6;
  
  if (discount > 0) {
    doc.text(`Desconto: R$ ${discount.toFixed(2).replace('.', ',')}`, totalsX, yPosition);
    yPosition += 6;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`TOTAL: R$ ${total.toFixed(2).replace('.', ',')}`, totalsX, yPosition);
  yPosition += 15;

  // Observações
  if (quote.observations) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', 20, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'normal');
    const splitObservations = doc.splitTextToSize(quote.observations, pageWidth - 40);
    doc.text(splitObservations, 20, yPosition);
    yPosition += splitObservations.length * 5 + 10;
  }

  // Condições de pagamento
  if (quote.paymentTerms) {
    doc.setFont('helvetica', 'bold');
    doc.text('Condições de Pagamento:', 20, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'normal');
    const splitPayment = doc.splitTextToSize(quote.paymentTerms, pageWidth - 40);
    doc.text(splitPayment, 20, yPosition);
    yPosition += splitPayment.length * 5 + 10;
  }

  // Prazo de execução
  if (quote.executionDeadline) {
    doc.setFont('helvetica', 'bold');
    doc.text('Prazo de Execução:', 20, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.text(quote.executionDeadline, 20, yPosition);
    yPosition += 10;
  }

  // Validade
  doc.setFont('helvetica', 'bold');
  doc.text('Validade do Orçamento:', 20, yPosition);
  yPosition += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(quote.validUntil), 'dd/MM/yyyy', { locale: ptBR }), 20, yPosition);

  // Marca d'água para plano gratuito
  if (!isPaidPlan) {
    doc.setFontSize(40);
    doc.setTextColor(200, 200, 200);
    doc.setFont('helvetica', 'bold');
    
    // Girar texto para diagonal
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    
    doc.text('Fechou!', centerX, centerY, {
      angle: 45,
      align: 'center'
    });
    
    // Voltar cor normal
    doc.setTextColor(0, 0, 0);
  }

  // Rodapé para plano gratuito
  if (!isPaidPlan) {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Gerado por Fechou! - Sistema de Orçamentos', pageWidth / 2, pageHeight - 10, {
      align: 'center'
    });
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