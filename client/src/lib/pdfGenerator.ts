
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
  
  // Margens
  const marginTop = 15;
  const marginBottom = 25;
  const marginLeft = 15;
  const marginRight = 15;
  
  let yPosition = marginTop;
  let currentPage = 1;

  // Função para verificar se precisa de nova página
  const checkPageBreak = (requiredSpace: number): boolean => {
    return (yPosition + requiredSpace) > (pageHeight - marginBottom);
  };

  // Função para adicionar nova página
  const addNewPage = () => {
    doc.addPage();
    currentPage++;
    yPosition = marginTop;
  };

  // Função para desenhar linha horizontal
  const drawHorizontalLine = (y: number, startX = marginLeft, endX = pageWidth - marginRight) => {
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(startX, y, endX, y);
  };

  // Função para desenhar retângulo com fundo cinza
  const drawGrayBackground = (x: number, y: number, width: number, height: number) => {
    doc.setFillColor(230, 230, 230);
    doc.rect(x, y, width, height, 'F');
  };

  // ========== CABEÇALHO DA EMPRESA ==========
  
  // Logo no canto superior esquerdo (se premium e tiver logo)
  if (isUserPremium && (user as any)?.logoUrl) {
    try {
      const logoSize = 20;
      const logoUrl = (user as any).logoUrl;
      if (logoUrl && logoUrl.trim() !== '') {
        let format = 'JPEG';
        if (logoUrl.includes('data:image/png')) {
          format = 'PNG';
        } else if (logoUrl.includes('data:image/gif')) {
          format = 'GIF';
        }
        doc.addImage(logoUrl, format, marginLeft, yPosition, logoSize, logoSize);
      }
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
    }
  }

  // Informações da empresa no cabeçalho
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  
  const businessName = user.businessName || `${user.firstName} ${user.lastName}`.trim();
  doc.text(businessName, marginLeft + (isUserPremium && (user as any)?.logoUrl ? 25 : 0), yPosition + 5);
  
  yPosition += 8;
  
  // Informações de contato no cabeçalho
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const contactInfo = [];
  if ((user as any).cpfCnpj) {
    contactInfo.push(`CNPJ: ${formatCPF((user as any).cpfCnpj)}`);
  }
  if ((user as any).phone) {
    contactInfo.push(`(${(user as any).phone.substring(0,2)})${(user as any).phone.substring(2,7)}-${(user as any).phone.substring(7)}`);
  }
  if (user.email) {
    contactInfo.push(user.email);
  }
  
  if ((user as any).address) {
    const address = `${(user as any).address}${(user as any).number ? `, ${(user as any).number}` : ''}`;
    doc.text(address, marginLeft, yPosition);
    yPosition += 4;
    
    if ((user as any).city && (user as any).state) {
      doc.text(`${(user as any).city}/${(user as any).state} - CEP: ${(user as any).cep || '00000-000'}`, marginLeft, yPosition);
      yPosition += 4;
    }
  }

  contactInfo.forEach(info => {
    doc.text(info, marginLeft, yPosition);
    yPosition += 4;
  });

  yPosition += 8;
  drawHorizontalLine(yPosition);
  yPosition += 8;

  // ========== TÍTULO E NÚMERO DO PEDIDO ==========
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`PEDIDO Nº ${quote.quoteNumber}`, pageWidth / 2, yPosition, { align: 'center' });
  
  // Data no canto direito
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(), 'dd/MM/yyyy', { locale: ptBR }), pageWidth - marginRight, yPosition, { align: 'right' });
  
  yPosition += 12;

  // ========== PRAZOS ==========
  
  drawGrayBackground(marginLeft, yPosition - 2, pageWidth - marginLeft - marginRight, 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PRAZO DE ENTREGA:', marginLeft + 2, yPosition + 3);
  doc.text(quote.executionDeadline || 'A definir', marginLeft + 50, yPosition + 3);
  yPosition += 8;

  // Data da Retirada e Venda Efetivada Por
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Data da Retirada:', marginLeft + 2, yPosition + 3);
  doc.text(format(new Date(quote.validUntil), 'dd/MM/yyyy', { locale: ptBR }), marginLeft + 35, yPosition + 3);
  
  doc.text('VENDA EFETIVADA POR:', marginLeft + 100, yPosition + 3);
  doc.text(businessName, marginLeft + 160, yPosition + 3);
  
  yPosition += 12;

  // ========== DADOS DO CLIENTE ==========
  
  drawGrayBackground(marginLeft, yPosition - 2, pageWidth - marginLeft - marginRight, 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', marginLeft + 2, yPosition + 3);
  yPosition += 12;

  // Informações do cliente em duas colunas
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  // Coluna esquerda
  doc.text('Razão social:', marginLeft + 2, yPosition);
  doc.text(quote.client.name, marginLeft + 25, yPosition);
  yPosition += 6;

  if (quote.client.email) {
    doc.text('CNPj/CPF:', marginLeft + 2, yPosition);
    doc.text(quote.client.email, marginLeft + 25, yPosition);
    yPosition += 6;
  }

  if (quote.client.address) {
    doc.text('CEP:', marginLeft + 2, yPosition);
    doc.text('00000-000', marginLeft + 25, yPosition);
    yPosition += 6;
  }

  if (quote.client.phone) {
    doc.text('Telefone:', marginLeft + 2, yPosition);
    doc.text(quote.client.phone, marginLeft + 25, yPosition);
    yPosition += 6;
  }

  // Coluna direita
  const rightColumnX = pageWidth / 2 + 10;
  let rightColumnY = yPosition - (quote.client.email ? 24 : 18);

  doc.text('Nome fantasia:', rightColumnX, rightColumnY);
  doc.text(quote.client.name, rightColumnX + 30, rightColumnY);
  rightColumnY += 6;

  if (quote.client.address) {
    doc.text('Endereço:', rightColumnX, rightColumnY);
    const address = `${quote.client.address}${quote.client.number ? `, ${quote.client.number}` : ''}`;
    doc.text(address, rightColumnX + 20, rightColumnY);
    rightColumnY += 6;

    if (quote.client.city && quote.client.state) {
      doc.text('Cidade/UF:', rightColumnX, rightColumnY);
      doc.text(`${quote.client.city}/${quote.client.state}`, rightColumnX + 22, rightColumnY);
      rightColumnY += 6;
    }
  }

  if (quote.client.email) {
    doc.text('E-mail:', rightColumnX, rightColumnY);
    doc.text(quote.client.email, rightColumnX + 15, rightColumnY);
  }

  yPosition += 8;

  // ========== TABELA DE SERVIÇOS ==========
  
  if (checkPageBreak(100)) {
    addNewPage();
  }

  drawGrayBackground(marginLeft, yPosition - 2, pageWidth - marginLeft - marginRight, 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SERVIÇOS', marginLeft + 2, yPosition + 3);
  yPosition += 12;

  // Cabeçalho da tabela
  const tableStartY = yPosition;
  const tableWidth = pageWidth - marginLeft - marginRight;
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  
  drawGrayBackground(marginLeft, yPosition - 2, tableWidth, 10);
  doc.rect(marginLeft, yPosition - 2, tableWidth, 10, 'S');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ITEM', marginLeft + 2, yPosition + 4);
  doc.text('NOME', marginLeft + 15, yPosition + 4);
  doc.text('QTD.', marginLeft + 120, yPosition + 4, { align: 'center' });
  doc.text('VR. UNIT.', marginLeft + 145, yPosition + 4, { align: 'center' });
  doc.text('SUBTOTAL', marginLeft + 175, yPosition + 4, { align: 'center' });
  
  // Linhas verticais do cabeçalho
  doc.line(marginLeft + 12, yPosition - 2, marginLeft + 12, yPosition + 8);
  doc.line(marginLeft + 110, yPosition - 2, marginLeft + 110, yPosition + 8);
  doc.line(marginLeft + 135, yPosition - 2, marginLeft + 135, yPosition + 8);
  doc.line(marginLeft + 160, yPosition - 2, marginLeft + 160, yPosition + 8);
  
  yPosition += 10;

  // Itens da tabela
  doc.setFont('helvetica', 'normal');
  quote.items.forEach((item, index) => {
    if (checkPageBreak(12)) {
      addNewPage();
    }

    // Linha da tabela
    doc.rect(marginLeft, yPosition - 2, tableWidth, 10, 'S');
    
    doc.text((index + 1).toString(), marginLeft + 2, yPosition + 4);
    
    const description = doc.splitTextToSize(item.description, 90);
    doc.text(description[0], marginLeft + 15, yPosition + 4);
    
    doc.text(item.quantity.toString(), marginLeft + 120, yPosition + 4, { align: 'center' });
    
    const unitPrice = parseFloat(item.unitPrice);
    const total = parseFloat(item.total);
    doc.text(unitPrice.toFixed(2).replace('.', ','), marginLeft + 145, yPosition + 4, { align: 'center' });
    doc.text(total.toFixed(2).replace('.', ','), marginLeft + 175, yPosition + 4, { align: 'center' });
    
    // Linhas verticais
    doc.line(marginLeft + 12, yPosition - 2, marginLeft + 12, yPosition + 8);
    doc.line(marginLeft + 110, yPosition - 2, marginLeft + 110, yPosition + 8);
    doc.line(marginLeft + 135, yPosition - 2, marginLeft + 135, yPosition + 8);
    doc.line(marginLeft + 160, yPosition - 2, marginLeft + 160, yPosition + 8);
    
    yPosition += 10;
  });

  // Total da seção SERVIÇOS
  drawGrayBackground(marginLeft, yPosition - 2, tableWidth, 8);
  doc.rect(marginLeft, yPosition - 2, tableWidth, 8, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', marginLeft + 15, yPosition + 3);
  doc.text(quote.items.length.toString(), marginLeft + 120, yPosition + 3, { align: 'center' });
  
  const totalServices = parseFloat(quote.total);
  doc.text(totalServices.toFixed(2).replace('.', ','), marginLeft + 175, yPosition + 3, { align: 'center' });
  
  // Linhas verticais
  doc.line(marginLeft + 12, yPosition - 2, marginLeft + 12, yPosition + 6);
  doc.line(marginLeft + 110, yPosition - 2, marginLeft + 110, yPosition + 6);
  doc.line(marginLeft + 135, yPosition - 2, marginLeft + 135, yPosition + 6);
  doc.line(marginLeft + 160, yPosition - 2, marginLeft + 160, yPosition + 6);
  
  yPosition += 15;

  // ========== SEÇÃO PRODUTOS (VAZIA) ==========
  
  if (checkPageBreak(40)) {
    addNewPage();
  }

  drawGrayBackground(marginLeft, yPosition - 2, pageWidth - marginLeft - marginRight, 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUTOS', marginLeft + 2, yPosition + 3);
  yPosition += 12;

  // Cabeçalho da tabela de produtos
  drawGrayBackground(marginLeft, yPosition - 2, tableWidth, 10);
  doc.rect(marginLeft, yPosition - 2, tableWidth, 10, 'S');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ITEM', marginLeft + 2, yPosition + 4);
  doc.text('NOME', marginLeft + 15, yPosition + 4);
  doc.text('UND.', marginLeft + 110, yPosition + 4, { align: 'center' });
  doc.text('QTD.', marginLeft + 130, yPosition + 4, { align: 'center' });
  doc.text('VR. UNIT.', marginLeft + 150, yPosition + 4, { align: 'center' });
  doc.text('SUBTOTAL', marginLeft + 175, yPosition + 4, { align: 'center' });
  
  // Linhas verticais
  doc.line(marginLeft + 12, yPosition - 2, marginLeft + 12, yPosition + 8);
  doc.line(marginLeft + 105, yPosition - 2, marginLeft + 105, yPosition + 8);
  doc.line(marginLeft + 125, yPosition - 2, marginLeft + 125, yPosition + 8);
  doc.line(marginLeft + 145, yPosition - 2, marginLeft + 145, yPosition + 8);
  doc.line(marginLeft + 165, yPosition - 2, marginLeft + 165, yPosition + 8);
  
  yPosition += 10;

  // Linha em branco para produtos
  doc.rect(marginLeft, yPosition - 2, tableWidth, 10, 'S');
  doc.setFont('helvetica', 'normal');
  doc.text('1', marginLeft + 2, yPosition + 4);
  doc.text('(Nenhum produto cadastrado)', marginLeft + 15, yPosition + 4);
  doc.text('UN', marginLeft + 110, yPosition + 4, { align: 'center' });
  doc.text('0,00', marginLeft + 130, yPosition + 4, { align: 'center' });
  doc.text('0,00', marginLeft + 150, yPosition + 4, { align: 'center' });
  doc.text('0,00', marginLeft + 175, yPosition + 4, { align: 'center' });
  
  // Linhas verticais
  doc.line(marginLeft + 12, yPosition - 2, marginLeft + 12, yPosition + 8);
  doc.line(marginLeft + 105, yPosition - 2, marginLeft + 105, yPosition + 8);
  doc.line(marginLeft + 125, yPosition - 2, marginLeft + 125, yPosition + 8);
  doc.line(marginLeft + 145, yPosition - 2, marginLeft + 145, yPosition + 8);
  doc.line(marginLeft + 165, yPosition - 2, marginLeft + 165, yPosition + 8);
  
  yPosition += 10;

  // Total produtos
  drawGrayBackground(marginLeft, yPosition - 2, tableWidth, 8);
  doc.rect(marginLeft, yPosition - 2, tableWidth, 8, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', marginLeft + 15, yPosition + 3);
  doc.text('0,00', marginLeft + 130, yPosition + 3, { align: 'center' });
  doc.text('0,00', marginLeft + 175, yPosition + 3, { align: 'center' });
  
  // Linhas verticais
  doc.line(marginLeft + 12, yPosition - 2, marginLeft + 12, yPosition + 6);
  doc.line(marginLeft + 105, yPosition - 2, marginLeft + 105, yPosition + 6);
  doc.line(marginLeft + 125, yPosition - 2, marginLeft + 125, yPosition + 6);
  doc.line(marginLeft + 145, yPosition - 2, marginLeft + 145, yPosition + 6);
  doc.line(marginLeft + 165, yPosition - 2, marginLeft + 165, yPosition + 6);
  
  yPosition += 15;

  // ========== RESUMO FINANCEIRO ==========
  
  if (checkPageBreak(30)) {
    addNewPage();
  }

  // Totais no lado direito
  const summaryX = pageWidth - 80;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SERVIÇOS:', summaryX, yPosition, { align: 'right' });
  doc.text(`${totalServices.toFixed(2).replace('.', ',')}`, summaryX + 25, yPosition, { align: 'right' });
  yPosition += 6;

  doc.text('DESCONTOS:', summaryX, yPosition, { align: 'right' });
  doc.text('0,00', summaryX + 25, yPosition, { align: 'right' });
  yPosition += 6;

  // Total geral
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', summaryX, yPosition, { align: 'right' });
  doc.text(`R$ ${totalServices.toFixed(2).replace('.', ',')}`, summaryX + 25, yPosition, { align: 'right' });
  yPosition += 15;

  // ========== ANEXO ==========
  
  if (quote.observations) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('ANEXO:', marginLeft, yPosition);
    doc.text(quote.observations, marginLeft + 20, yPosition);
    yPosition += 15;
  }

  // ========== ASSINATURA ==========
  
  if (checkPageBreak(40)) {
    addNewPage();
  }

  // Caixa de assinatura
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(marginLeft, yPosition, pageWidth - marginLeft - marginRight, 30, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Assinatura do cliente', pageWidth / 2, yPosition + 25, { align: 'center' });

  // Marca d'água para plano gratuito
  if (!isUserPremium) {
    doc.setGState(doc.GState({ opacity: 0.1 }));
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    
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
    
    doc.setGState(doc.GState({ opacity: 1.0 }));
    doc.setTextColor(0, 0, 0);
  }

  // Rodapé
  const footerY = pageHeight - 10;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Pedido emitido no Fechou! - www.fechou.com.br', pageWidth / 2, footerY, { align: 'center' });

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
