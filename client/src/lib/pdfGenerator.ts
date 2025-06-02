import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { QuoteWithDetails, User } from '@/types';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

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
  if (isPaidPlan && user.logoUrl) {
    // Se é plano pago e tem logo, adiciona o logo
    try {
      // Carregar e adicionar logo (implementação simplificada)
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(user.businessName || `${user.firstName} ${user.lastName}`.trim(), 20, yPosition);
      yPosition += 15;
    } catch (error) {
      // Fallback para nome sem logo
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(user.businessName || `${user.firstName} ${user.lastName}`.trim(), 20, yPosition);
      yPosition += 15;
    }
  } else {
    // Plano gratuito ou sem logo
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(user.businessName || `${user.firstName} ${user.lastName}`.trim(), 20, yPosition);
    yPosition += 15;
  }

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

  // Tabela de itens
  const tableData = quote.items.map(item => [
    item.description,
    item.quantity.toString(),
    `R$ ${parseFloat(item.unitPrice).toFixed(2).replace('.', ',')}`,
    `R$ ${parseFloat(item.total).toFixed(2).replace('.', ',')}`
  ]);

  doc.autoTable({
    startY: yPosition,
    head: [['Descrição', 'Qtd', 'Valor Unit.', 'Total']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [66, 126, 234], // Azul
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' }
    }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

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