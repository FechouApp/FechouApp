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
  let logoWidth = 0;
  let logoHeight = 0;
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
        logoWidth = logoSize + 5; // Espaço após o logo
        logoHeight = logoSize;
      }
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
    }
  }

  // Informações da empresa ao lado do logotipo
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');

  const businessName = user.businessName || `${user.firstName} ${user.lastName}`.trim();
  const textStartX = logoWidth > 0 ? marginLeft + logoWidth + 5 : marginLeft;

  // Nome da empresa
  doc.text(businessName, textStartX, yPosition + 5);

  // Informações completas ao lado do logo
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  let infoY = yPosition + 12;

  // Endereço completo
  if ((user as any).address) {
    const address = `${(user as any).address}${(user as any).number ? `, ${(user as any).number}` : ''}`;
    doc.text(address, textStartX, infoY);
    infoY += 4;

    if ((user as any).city && (user as any).state) {
      doc.text(`${(user as any).city}/${(user as any).state} - CEP: ${(user as any).cep || '00000-000'}`, textStartX, infoY);
      infoY += 4;
    }
  }

  // CNPJ/CPF
  if ((user as any).cpfCnpj) {
    doc.text(`CNPJ: ${formatCPF((user as any).cpfCnpj)}`, textStartX, infoY);
    infoY += 4;
  }

  // Telefone
  if ((user as any).phone) {
    doc.text(`Telefone: (${(user as any).phone.substring(0,2)}) ${(user as any).phone.substring(2,7)}-${(user as any).phone.substring(7)}`, textStartX, infoY);
    infoY += 4;
  }

  // Email
  if (user.email) {
    doc.text(`Email: ${user.email}`, textStartX, infoY);
    infoY += 4;
  }

  // Ajustar yPosition baseado no conteúdo
  yPosition = Math.max(yPosition + logoHeight + 5, infoY);

  yPosition += 4; // Espaçamento ainda mais reduzido antes da linha
  drawHorizontalLine(yPosition);
  yPosition += 8;

  // ========== TÍTULO E NÚMERO DO ORÇAMENTO ==========

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`ORÇAMENTO Nº ${quote.quoteNumber}`, pageWidth / 2, yPosition, { align: 'center' });

  // Data no canto direito
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(), 'dd/MM/yyyy', { locale: ptBR }), pageWidth - marginRight, yPosition, { align: 'right' });

  yPosition += 15;

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

  // ========== TABELA DE SERVIÇOS OU PRODUTOS ==========

  if (checkPageBreak(100)) {
    addNewPage();
  }

  drawGrayBackground(marginLeft, yPosition - 2, pageWidth - marginLeft - marginRight, 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SERVIÇOS OU PRODUTOS', marginLeft + 2, yPosition + 3);
  yPosition += 12;

  // Cabeçalho da tabela com margens ajustadas
  const tableStartY = yPosition;
  const tableWidth = pageWidth - marginLeft - marginRight;

  // Definir larguras das colunas
  const itemColWidth = 12;
  const nameColWidth = 90;
  const qtyColWidth = 20;
  const unitPriceColWidth = 25;
  const subtotalColWidth = tableWidth - itemColWidth - nameColWidth - qtyColWidth - unitPriceColWidth;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);

  drawGrayBackground(marginLeft, yPosition - 2, tableWidth, 10);
  doc.rect(marginLeft, yPosition - 2, tableWidth, 10, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ITEM', marginLeft + itemColWidth/2, yPosition + 4, { align: 'center' });
  doc.text('NOME', marginLeft + itemColWidth + nameColWidth/2, yPosition + 4, { align: 'center' });
  doc.text('QTD.', marginLeft + itemColWidth + nameColWidth + qtyColWidth/2, yPosition + 4, { align: 'center' });
  doc.text('VR. UNIT.', marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth/2, yPosition + 4, { align: 'center' });
  doc.text('SUBTOTAL', marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth + subtotalColWidth/2, yPosition + 4, { align: 'center' });

  // Linhas verticais do cabeçalho
  doc.line(marginLeft + itemColWidth, yPosition - 2, marginLeft + itemColWidth, yPosition + 8);
  doc.line(marginLeft + itemColWidth + nameColWidth, yPosition - 2, marginLeft + itemColWidth + nameColWidth, yPosition + 8);
  doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition - 2, marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition + 8);
  doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition - 2, marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition + 8);

  yPosition += 10;

  // Itens da tabela
  doc.setFont('helvetica', 'normal');
  quote.items.forEach((item, index) => {
    if (checkPageBreak(yPosition + 6)) {
      addNewPage();
    }

    // Linha da tabela
    doc.rect(marginLeft, yPosition - 2, tableWidth, 10, 'S');

    doc.text((index + 1).toString(), marginLeft + itemColWidth/2, yPosition + 4, { align: 'center' });

    const description = doc.splitTextToSize(item.description, nameColWidth - 4);
    doc.text(description[0], marginLeft + itemColWidth + 2, yPosition + 4);

    doc.text(item.quantity.toString(), marginLeft + itemColWidth + nameColWidth + qtyColWidth/2, yPosition + 4, { align: 'center' });

    const unitPrice = parseFloat(item.unitPrice);
    const total = parseFloat(item.total);
    doc.text(unitPrice.toFixed(2).replace('.', ','), marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth/2, yPosition + 4, { align: 'center' });
    doc.text(total.toFixed(2).replace('.', ','), marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth + subtotalColWidth/2, yPosition + 4, { align: 'center' });

    // Linhas verticais
    doc.line(marginLeft + itemColWidth, yPosition - 2, marginLeft + itemColWidth, yPosition + 8);
    doc.line(marginLeft + itemColWidth + nameColWidth, yPosition - 2, marginLeft + itemColWidth + nameColWidth, yPosition + 8);
    doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition - 2, marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition + 8);
    doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition - 2, marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition + 8);

    yPosition += 6;
  });

  // Total da seção SERVIÇOS OU PRODUTOS
  drawGrayBackground(marginLeft, yPosition - 2, tableWidth, 8);
  doc.rect(marginLeft, yPosition - 2, tableWidth, 8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', marginLeft + itemColWidth + 2, yPosition + 3);
  doc.text(quote.items.length.toString(), marginLeft + itemColWidth + nameColWidth + qtyColWidth/2, yPosition + 3, { align: 'center' });

  const totalServices = parseFloat(quote.total);
  doc.text(totalServices.toFixed(2).replace('.', ','), marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth + subtotalColWidth/2, yPosition + 3, { align: 'center' });

  // Linhas verticais
  doc.line(marginLeft + itemColWidth, yPosition - 2, marginLeft + itemColWidth, yPosition + 6);
  doc.line(marginLeft + itemColWidth + nameColWidth, yPosition - 2, marginLeft + itemColWidth + nameColWidth, yPosition + 6);
  doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition - 2, marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition + 6);
  doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition - 2, marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition + 6);

  yPosition += 15;

  // ========== PRAZO DE ENTREGA ==========

  drawGrayBackground(marginLeft, yPosition - 2, pageWidth - marginLeft - marginRight, 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PRAZO DE ENTREGA:', marginLeft + 2, yPosition + 3);
  doc.text(quote.executionDeadline || 'A definir', marginLeft + 50, yPosition + 3);
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

  // ========== INFORMAÇÕES ADICIONAIS DO ORÇAMENTO ==========

  if (quote.observations || quote.paymentTerms || quote.warranty) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    let additionalInfoY = yPosition;
    const leftColumnX = marginLeft;
    const rightColumnX = pageWidth / 2 + 10;

    // Coluna esquerda
    if (quote.observations) {
      doc.text('Observações:', leftColumnX, additionalInfoY);
      const obsLines = doc.splitTextToSize(quote.observations, 80);
      obsLines.forEach((line: string, index: number) => {
        doc.text(line, leftColumnX + (index === 0 ? 25 : 0), additionalInfoY + (index * 4));
      });
      additionalInfoY += Math.max(8, obsLines.length * 4);
    }

    // Coluna direita
    let rightInfoY = yPosition;
    if (quote.paymentTerms) {
      doc.text('Condições de Pagamento:', rightColumnX, rightInfoY);
      rightInfoY += 8; // Espaço maior após o título para melhor separação
      const paymentLines = doc.splitTextToSize(quote.paymentTerms, 80);
      paymentLines.forEach((line: string, index: number) => {
        doc.text(line, rightColumnX, rightInfoY + (index * 4));
      });
      rightInfoY += Math.max(8, paymentLines.length * 4) + 6; // Espaço adicional maior
    }

    if (quote.warranty) {
      doc.text('Garantia:', rightColumnX, rightInfoY);
      rightInfoY += 6; // Quebra de linha após o título
      const warrantyLines = doc.splitTextToSize(quote.warranty, 80);
      warrantyLines.forEach((line: string, index: number) => {
        doc.text(line, rightColumnX, rightInfoY + (index * 4));
      });
      rightInfoY += Math.max(8, warrantyLines.length * 4);
    }

    yPosition = Math.max(additionalInfoY, rightInfoY) + 5;
  }

  // ========== ASSINATURA SEM RETÂNGULO ==========

  if (checkPageBreak(35)) {
    addNewPage();
  }

  yPosition += 10; // Espaçamento antes da assinatura

  // Dados do usuário na assinatura
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(businessName, marginLeft, yPosition);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  let signatureY = yPosition + 6;

  if ((user as any).address) {
    const address = `${(user as any).address}${(user as any).number ? `, ${(user as any).number}` : ''}`;
    doc.text(address, marginLeft, signatureY);
    signatureY += 4;

    if ((user as any).city && (user as any).state) {
      doc.text(`${(user as any).city}/${(user as any).state} - CEP: ${(user as any).cep || '00000-000'}`, marginLeft, signatureY);
      signatureY += 4;
    }
  }

  const signatureContactInfo = [];
  if ((user as any).cpfCnpj) {
    signatureContactInfo.push(`CNPJ: ${formatCPF((user as any).cpfCnpj)}`);
  }
  if ((user as any).phone) {
    signatureContactInfo.push(`Telefone: (${(user as any).phone.substring(0,2)}) ${(user as any).phone.substring(2,7)}-${(user as any).phone.substring(7)}`);
  }
  if (user.email) {
    signatureContactInfo.push(`Email: ${user.email}`);
  }

  signatureContactInfo.forEach(info => {
    doc.text(info, marginLeft, signatureY);
    signatureY += 4;
  });

  signatureY += 4; // Espaço antes da linha de assinatura

  // Linha para assinatura (mais elegante)
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, signatureY, marginLeft + 80, signatureY);

  // Texto "Assinatura" abaixo da linha
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Assinatura', marginLeft, signatureY + 4);

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
  doc.text('Orçamento emitido no Fechou! - www.fechou.com.br', pageWidth / 2, footerY, { align: 'center' });

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