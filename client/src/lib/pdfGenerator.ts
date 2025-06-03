import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { QuoteWithDetails, User } from '@/types';
import { formatPhone, formatCPF, formatCEP } from './utils';

interface PDFGeneratorOptions {
  quote: QuoteWithDetails;
  user: User;
  isUserPremium: boolean;
}

export async function generateQuotePDF({ quote, user, isUserPremium }: PDFGeneratorOptions): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  let yPosition = 20;

  // Logo Premium no canto superior direito
  if (isUserPremium && (user as any)?.logoUrl) {
    try {
      // Reservar espaço para o logo (30x30)
      const logoSize = 25;
      const logoX = pageWidth - logoSize - 20;
      const logoY = 15;
      
      // Verificar se existe logo e não está vazio
      const logoUrl = (user as any).logoUrl;
      if (logoUrl && logoUrl.trim() !== '') {
        console.log('Adding logo to PDF:', logoUrl.substring(0, 50) + '...');
        // Detectar formato da imagem
        let format = 'JPEG';
        if (logoUrl.includes('data:image/png')) {
          format = 'PNG';
        } else if (logoUrl.includes('data:image/gif')) {
          format = 'GIF';
        }
        
        // Adicionar logo
        doc.addImage(logoUrl, format, logoX, logoY, logoSize, logoSize);
      }
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
    }
  }

  // Layout Premium mais elegante
  if (isUserPremium) {
    // Cabeçalho Premium sem linhas decorativas
    yPosition += 12;
    
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('ORÇAMENTO', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nº ${quote.quoteNumber} • ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
  } else {
    // Layout padrão para plano gratuito
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('ORÇAMENTO', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(`Orçamento nº ${quote.quoteNumber} – ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
  }

  // Marca d'água posicionada na área em branco (será adicionada no final)
  let watermarkAdded = false;

  yPosition += 5;

  // Seção de dados do cliente - garantir cor preta
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', 20, yPosition);
  yPosition += 6;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${quote.client.name}`, 20, yPosition);
  yPosition += 5;
  
  if (quote.client.email) {
    doc.text(`Email: ${quote.client.email}`, 20, yPosition);
    yPosition += 5;
  }
  
  if (quote.client.phone) {
    doc.text(`Telefone: ${quote.client.phone}`, 20, yPosition);
    yPosition += 5;
  }

  if (quote.client.address) {
    const address = `${quote.client.address}${quote.client.number ? `, ${quote.client.number}` : ''}${quote.client.complement ? `, ${quote.client.complement}` : ''}`;
    doc.text(`Endereco: ${address}`, 20, yPosition);
    yPosition += 5;
    
    if (quote.client.city && quote.client.state) {
      doc.text(`${quote.client.city} - ${quote.client.state}`, 20, yPosition);
      yPosition += 5;
    }
  }

  yPosition += 8;

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

  // Tabela de serviços
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SERVIÇOS', 20, yPosition);
  yPosition += 8;

  // Configuração da tabela com posições corrigidas para evitar sobreposição
  const tableStartY = yPosition;
  const tableWidth = pageWidth - 40;
  const rowHeight = 8;
  
  // Garantir que as linhas da tabela sejam pretas
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  
  // Cabeçalho da tabela com fundo cinza
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPosition - 2, tableWidth, rowHeight, 'F');
  doc.rect(20, yPosition - 2, tableWidth, rowHeight, 'S');
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Descrição', 22, yPosition + 3);
  doc.text('Qtd', 100, yPosition + 3, { align: 'center' });
  doc.text('Valor Unit.', 150, yPosition + 3, { align: 'right' });
  doc.text('Total', 185, yPosition + 3, { align: 'right' });
  
  // Linhas verticais do cabeçalho - bem espaçadas
  doc.line(90, tableStartY - 2, 90, yPosition + 6);
  doc.line(120, tableStartY - 2, 120, yPosition + 6);
  doc.line(160, tableStartY - 2, 160, yPosition + 6);
  
  yPosition += rowHeight;

  // Itens da tabela
  doc.setFont('helvetica', 'normal');
  quote.items.forEach((item, index) => {
    // Verificar se precisa de nova página
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 20;
    }

    // Fundo alternado para as linhas
    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(20, yPosition - 2, tableWidth, rowHeight, 'F');
    }
    
    // Bordas da linha
    doc.rect(20, yPosition - 2, tableWidth, rowHeight, 'S');
    
    const description = doc.splitTextToSize(item.description, 65);
    doc.text(description, 22, yPosition + 3);
    doc.text(item.quantity.toString(), 100, yPosition + 3, { align: 'center' });
    
    // Formatação de valores com alinhamento correto
    const unitPrice = parseFloat(item.unitPrice);
    const total = parseFloat(item.total);
    doc.text(`R$ ${unitPrice.toFixed(2).replace('.', ',')}`, 150, yPosition + 3, { align: 'right' });
    doc.text(`R$ ${total.toFixed(2).replace('.', ',')}`, 185, yPosition + 3, { align: 'right' });
    
    // Linhas verticais - bem espaçadas
    doc.line(90, yPosition - 2, 90, yPosition + 6);
    doc.line(120, yPosition - 2, 120, yPosition + 6);
    doc.line(160, yPosition - 2, 160, yPosition + 6);
    
    yPosition += rowHeight;
  });

  yPosition += 4;

  // Total geral destacado - alinhado com a coluna Total
  const subtotal = parseFloat(quote.subtotal);
  const discount = parseFloat(quote.discount);
  const total = parseFloat(quote.total);

  // Linha do total final destacada - alinhada com a tabela
  doc.setFillColor(220, 220, 220);
  doc.rect(90, yPosition - 2, 95, 10, 'F');
  doc.rect(90, yPosition - 2, 95, 10, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL GERAL:', 92, yPosition + 4);
  doc.text(`R$ ${total.toFixed(2).replace('.', ',')}`, 183, yPosition + 4, { align: 'right' });
  yPosition += 20;

  // Seção de condições organizadas
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDIÇÕES', 20, yPosition);
  yPosition += 10;

  // Condições de pagamento
  if (quote.paymentTerms) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Condições de pagamento:', 20, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'normal');
    const splitPayment = doc.splitTextToSize(quote.paymentTerms, pageWidth - 40);
    doc.text(splitPayment, 20, yPosition);
    yPosition += splitPayment.length * 4 + 8;
  }

  // Prazo de execução
  if (quote.executionDeadline) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Prazo de execução:', 20, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.text(quote.executionDeadline, 20, yPosition);
    yPosition += 8;
  }

  // Validade do orçamento
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Validade do orçamento:', 20, yPosition);
  yPosition += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Válido até ${format(new Date(quote.validUntil), 'dd/MM/yyyy', { locale: ptBR })}`, 20, yPosition);
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
    yPosition += splitObservations.length * 4 + 8;
  }

  // Texto padrão ao final
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Fico à disposição para dúvidas e aguardo sua aprovação.', 20, yPosition);
  yPosition += 25;

  // Assinatura centralizada com dados do profissional
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(user.businessName || `${user.firstName} ${user.lastName}`.trim(), pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (user.email) {
    doc.text(`Email: ${user.email}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 4;
  }

  if ((user as any).cpfCnpj) {
    doc.text(`CPF/CNPJ: ${formatCPF((user as any).cpfCnpj)}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 4;
  }
  
  if ((user as any).phone) {
    doc.text(`Telefone: ${formatPhone((user as any).phone)}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 4;
  }
  
  if ((user as any).address) {
    doc.text(`Endereço: ${(user as any).address}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 4;
  }

  yPosition += 5;

  // Verificar se há espaço suficiente na página atual antes de adicionar marca d'água e rodapé
  const remainingSpace = pageHeight - yPosition;
  const needsNewPage = remainingSpace < 60; // Só criar nova página se realmente não couber
  
  if (needsNewPage) {
    doc.addPage();
    yPosition = 20;
  }

  // Marca d'água para plano gratuito
  if (!isUserPremium) {
    doc.setGState(doc.GState({ opacity: 0.1 }));
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    
    // Posicionar no canto inferior direito em área livre
    const watermarkX = pageWidth - 50;
    const watermarkY = pageHeight - 60;
    
    doc.text('Fechou!', watermarkX, watermarkY, { 
      align: 'center',
      angle: 45
    });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('O jeito moderno', watermarkX, watermarkY + 8, { 
      align: 'center',
      angle: 45
    });
    doc.text('de fechar negócios', watermarkX, watermarkY + 15, { 
      align: 'center',
      angle: 45
    });
    
    // Restaurar opacidade normal
    doc.setGState(doc.GState({ opacity: 1.0 }));
    doc.setTextColor(0, 0, 0);
    watermarkAdded = true;
  }

  // Rodapé discreto para plano gratuito com margem adequada
  if (!isUserPremium) {
    // Posicionar o rodapé com margem de 25px da borda inferior
    const footerY = pageHeight - 25;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Gerado com Fechou!', pageWidth / 2, footerY, {
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