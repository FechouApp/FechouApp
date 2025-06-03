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
  yPosition += 12;

  // Informações do profissional
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (user.email) {
    doc.text(`Email: ${user.email}`, 20, yPosition);
    yPosition += 5;
  }

  // Dados pessoais do profissional (se disponíveis)
  if ((user as any).cpfCnpj) {
    // Formatar CPF/CNPJ
    const cpfCnpj = (user as any).cpfCnpj.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    doc.text(`CPF/CNPJ: ${cpfCnpj}`, 20, yPosition);
    yPosition += 5;
  }
  if ((user as any).phone) {
    // Formatar telefone
    const phone = (user as any).phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    doc.text(`Telefone: ${phone}`, 20, yPosition);
    yPosition += 5;
  }
  if ((user as any).address) {
    doc.text(`Endereco: ${(user as any).address}`, 20, yPosition);
    yPosition += 5;
  }

  yPosition += 15;

  // Título do orçamento centralizado
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Número do orçamento e data centralizados
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`No ${quote.quoteNumber} | ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Seção de dados do cliente
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
    doc.text(`Endereco: ${address}`, 20, yPosition);
    yPosition += 6;
    
    if (quote.client.city && quote.client.state) {
      doc.text(`${quote.client.city} - ${quote.client.state}`, 20, yPosition);
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

  // Seção de serviços
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SERVICOS', 20, yPosition);
  yPosition += 12;

  // Cabeçalho da tabela simples
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Descricao', 20, yPosition);
  doc.text('Qtd', 120, yPosition);
  doc.text('Valor Unit.', 140, yPosition);
  doc.text('Total', 170, yPosition);
  yPosition += 8;

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
    
    // Formatação de valores simples
    const unitPrice = parseFloat(item.unitPrice);
    const total = parseFloat(item.total);
    doc.text(`R$ ${unitPrice.toFixed(2).replace('.', ',')}`, 140, yPosition);
    doc.text(`R$ ${total.toFixed(2).replace('.', ',')}`, 170, yPosition);
    
    yPosition += Math.max(description.length * 5, 8);
  });

  yPosition += 10;

  // Totais simples
  const subtotal = parseFloat(quote.subtotal);
  const discount = parseFloat(quote.discount);
  const total = parseFloat(quote.total);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const totalsX = pageWidth - 80;
  doc.text(`Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}`, totalsX, yPosition);
  yPosition += 6;
  
  if (discount > 0) {
    doc.text(`Desconto: R$ ${discount.toFixed(2).replace('.', ',')}`, totalsX, yPosition);
    yPosition += 6;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`TOTAL: R$ ${total.toFixed(2).replace('.', ',')}`, totalsX, yPosition);
  yPosition += 20;

  // Condições de pagamento
  if (quote.paymentTerms) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Condicoes de Pagamento:', 20, yPosition);
    yPosition += 8;
    
    doc.setFont('helvetica', 'normal');
    const splitPayment = doc.splitTextToSize(quote.paymentTerms, pageWidth - 40);
    doc.text(splitPayment, 20, yPosition);
    yPosition += splitPayment.length * 5 + 10;
  }

  // Prazo de execução
  if (quote.executionDeadline) {
    doc.setFont('helvetica', 'bold');
    doc.text('Prazo de Execucao:', 20, yPosition);
    yPosition += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.text(quote.executionDeadline, 20, yPosition);
    yPosition += 10;
  }

  // Validade
  doc.setFont('helvetica', 'bold');
  doc.text('Validade:', 20, yPosition);
  yPosition += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`ate ${format(new Date(quote.validUntil), 'dd/MM/yyyy', { locale: ptBR })}`, 20, yPosition);
  yPosition += 15;

  // Observações
  if (quote.observations) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Observacoes:', 20, yPosition);
    yPosition += 8;
    
    doc.setFont('helvetica', 'normal');
    const splitObservations = doc.splitTextToSize(quote.observations, pageWidth - 40);
    doc.text(splitObservations, 20, yPosition);
    yPosition += splitObservations.length * 5 + 10;
  }

  // Marca d'água menor para plano gratuito
  if (!isPaidPlan) {
    doc.setFontSize(20);
    doc.setTextColor(240, 240, 240);
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

  // Rodapé simples - mais espaço do conteúdo
  if (!isPaidPlan) {
    yPosition += 20;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Gerado por Fechou! - Sistema de Orcamentos', pageWidth / 2, pageHeight - 15, {
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