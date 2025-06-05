
import jsPDF from 'jspdf';
import { format, addDays } from 'date-fns';
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

  // Função para formatar telefone corretamente
  const formatPhoneNumber = (phone: string): string => {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length === 11) {
      // Formato: (XX) XXXXX-XXXX
      return `(${cleanPhone.substring(0,2)}) ${cleanPhone.substring(2,7)}-${cleanPhone.substring(7)}`;
    } else if (cleanPhone.length === 10) {
      // Formato: (XX) XXXX-XXXX
      return `(${cleanPhone.substring(0,2)}) ${cleanPhone.substring(2,6)}-${cleanPhone.substring(6)}`;
    }
    return phone; // Retorna original se não conseguir formatar
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
    infoY += 3.5;

    if ((user as any).city && (user as any).state) {
      doc.text(`${(user as any).city}/${(user as any).state} - CEP: ${(user as any).cep || '00000-000'}`, textStartX, infoY);
      infoY += 3.5;
    }
  }

  // CNPJ/CPF
  if ((user as any).cpfCnpj) {
    doc.text(`CNPJ: ${formatCPF((user as any).cpfCnpj)}`, textStartX, infoY);
    infoY += 3.5;
  }

  // Telefone formatado corretamente
  if ((user as any).phone) {
    doc.text(`Telefone: ${formatPhoneNumber((user as any).phone)}`, textStartX, infoY);
    infoY += 3.5;
  }

  // Email
  if (user.email) {
    doc.text(`Email: ${user.email}`, textStartX, infoY);
    infoY += 3.5;
  }

  // Ajustar yPosition baseado no conteúdo
  yPosition = Math.max(yPosition + logoHeight + 5, infoY);

  yPosition += 3; // Espaçamento reduzido antes da linha
  drawHorizontalLine(yPosition);
  yPosition += 6;

  // ========== TÍTULO E NÚMERO DO ORÇAMENTO ==========

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`ORÇAMENTO Nº ${quote.quoteNumber}`, pageWidth / 2, yPosition, { align: 'center' });

  // Data no canto direito
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(), 'dd/MM/yyyy', { locale: ptBR }), pageWidth - marginRight, yPosition, { align: 'right' });

  yPosition += 12;

  // ========== DADOS DO CLIENTE ==========

  drawGrayBackground(marginLeft, yPosition - 2, pageWidth - marginLeft - marginRight, 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', marginLeft + 2, yPosition + 3);
  yPosition += 10;

  // Informações do cliente em duas colunas
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const rightColumnX = pageWidth / 2 + 10;
  let leftColumnY = yPosition;
  let rightColumnY = yPosition;

  // Coluna esquerda
  doc.text('Razão social:', marginLeft + 2, leftColumnY);
  doc.text(quote.client.name, marginLeft + 25, leftColumnY);
  leftColumnY += 5;

  // CPF/CNPJ (só mostra se existir)
  if (quote.client.cpf) {
    doc.text('CPF/CNPJ:', marginLeft + 2, leftColumnY);
    doc.text(formatCPF(quote.client.cpf), marginLeft + 25, leftColumnY);
    leftColumnY += 5;
  }

  // CEP (só mostra se existir)
  if (quote.client.zipCode) {
    doc.text('CEP:', marginLeft + 2, leftColumnY);
    doc.text(formatCEP(quote.client.zipCode), marginLeft + 25, leftColumnY);
    leftColumnY += 5;
  }

  // Telefone (só mostra se existir)
  if (quote.client.phone) {
    doc.text('Telefone:', marginLeft + 2, leftColumnY);
    doc.text(formatPhoneNumber(quote.client.phone), marginLeft + 25, leftColumnY);
    leftColumnY += 5;
  }

  // Coluna direita
  // Endereço (só mostra se existir)
  if (quote.client.address) {
    doc.text('Endereço:', rightColumnX, rightColumnY);
    const address = `${quote.client.address}${quote.client.number ? `, ${quote.client.number}` : ''}`;
    doc.text(address, rightColumnX + 20, rightColumnY);
    rightColumnY += 5;
  }

  // Cidade/UF (só mostra se ambos existirem)
  if (quote.client.city && quote.client.state) {
    doc.text('Cidade/UF:', rightColumnX, rightColumnY);
    doc.text(`${quote.client.city}/${quote.client.state}`, rightColumnX + 22, rightColumnY);
    rightColumnY += 5;
  }

  // E-mail (só mostra se existir)
  if (quote.client.email) {
    doc.text('E-mail:', rightColumnX, rightColumnY);
    doc.text(quote.client.email, rightColumnX + 15, rightColumnY);
    rightColumnY += 5;
  }

  // Ajustar yPosition baseado na coluna que ficou mais alta
  yPosition = Math.max(leftColumnY, rightColumnY) + 1;

  // ========== FOTOS DO ORÇAMENTO ==========

  console.log('Checking photos for PDF:', quote.photos);
  
  if (quote.photos && Array.isArray(quote.photos) && quote.photos.length > 0) {
    if (checkPageBreak(80)) {
      addNewPage();
    }

    drawGrayBackground(marginLeft, yPosition - 2, pageWidth - marginLeft - marginRight, 8);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('FOTOS DO ORÇAMENTO', marginLeft + 2, yPosition + 3);
    yPosition += 10;

    const photosPerRow = 2;
    const photoWidth = 60;
    const photoHeight = 45;
    const photoSpacing = 10;
    const startX = marginLeft + (pageWidth - marginLeft - marginRight - (photosPerRow * photoWidth) - ((photosPerRow - 1) * photoSpacing)) / 2;

    for (let i = 0; i < quote.photos.length; i++) {
      const photo = quote.photos[i];
      const row = Math.floor(i / photosPerRow);
      const col = i % photosPerRow;
      
      const x = startX + col * (photoWidth + photoSpacing);
      const y = yPosition + row * (photoHeight + photoSpacing);

      // Check if we need a new page for this photo
      if (y + photoHeight > pageHeight - marginBottom) {
        addNewPage();
        const newY = yPosition;
        const adjustedRow = row - Math.floor((pageHeight - marginBottom - yPosition) / (photoHeight + photoSpacing));
        const adjustedY = newY + adjustedRow * (photoHeight + photoSpacing);
        
        try {
          if (photo.url && photo.url.trim() !== '') {
            let format = 'JPEG';
            if (photo.url.includes('data:image/png')) {
              format = 'PNG';
            } else if (photo.url.includes('data:image/gif')) {
              format = 'GIF';
            }
            doc.addImage(photo.url, format, x, adjustedY, photoWidth, photoHeight);
          }
        } catch (error) {
          console.error('Erro ao carregar foto:', error);
          // Draw a placeholder rectangle if image fails to load
          doc.setDrawColor(200, 200, 200);
          doc.setFillColor(240, 240, 240);
          doc.rect(x, adjustedY, photoWidth, photoHeight, 'FD');
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(8);
          doc.text('Imagem não disponível', x + photoWidth/2, adjustedY + photoHeight/2, { align: 'center' });
          doc.setTextColor(0, 0, 0);
        }
      } else {
        try {
          if (photo.url && photo.url.trim() !== '') {
            let format = 'JPEG';
            if (photo.url.includes('data:image/png')) {
              format = 'PNG';
            } else if (photo.url.includes('data:image/gif')) {
              format = 'GIF';
            }
            doc.addImage(photo.url, format, x, y, photoWidth, photoHeight);
          }
        } catch (error) {
          console.error('Erro ao carregar foto:', error);
          // Draw a placeholder rectangle if image fails to load
          doc.setDrawColor(200, 200, 200);
          doc.setFillColor(240, 240, 240);
          doc.rect(x, y, photoWidth, photoHeight, 'FD');
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(8);
          doc.text('Imagem não disponível', x + photoWidth/2, y + photoHeight/2, { align: 'center' });
          doc.setTextColor(0, 0, 0);
        }
      }
    }

    const totalRows = Math.ceil(quote.photos.length / photosPerRow);
    yPosition += totalRows * (photoHeight + photoSpacing) + 5;
  }

  // ========== TABELA DE SERVIÇOS OU PRODUTOS ==========

  if (checkPageBreak(60)) {
    addNewPage();
  }

  drawGrayBackground(marginLeft, yPosition - 2, pageWidth - marginLeft - marginRight, 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SERVIÇOS OU PRODUTOS', marginLeft + 2, yPosition + 3);
  yPosition += 10;

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

  drawGrayBackground(marginLeft, yPosition - 2, tableWidth, 8);
  doc.rect(marginLeft, yPosition - 2, tableWidth, 8, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ITEM', marginLeft + itemColWidth/2, yPosition + 3, { align: 'center' });
  doc.text('NOME', marginLeft + itemColWidth + nameColWidth/2, yPosition + 3, { align: 'center' });
  doc.text('QTD.', marginLeft + itemColWidth + nameColWidth + qtyColWidth/2, yPosition + 3, { align: 'center' });
  doc.text('VR. UNIT.', marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth/2, yPosition + 3, { align: 'center' });
  doc.text('SUBTOTAL', marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth + subtotalColWidth/2, yPosition + 3, { align: 'center' });

  // Linhas verticais do cabeçalho
  doc.line(marginLeft + itemColWidth, yPosition - 2, marginLeft + itemColWidth, yPosition + 6);
  doc.line(marginLeft + itemColWidth + nameColWidth, yPosition - 2, marginLeft + itemColWidth + nameColWidth, yPosition + 6);
  doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition - 2, marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition + 6);
  doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition - 2, marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition + 6);

  yPosition += 8;

  // Itens da tabela
  doc.setFont('helvetica', 'normal');
  quote.items.forEach((item, index) => {
    if (checkPageBreak(8)) {
      addNewPage();
    }

    // Linha da tabela
    doc.rect(marginLeft, yPosition - 2, tableWidth, 8, 'S');

    doc.text((index + 1).toString(), marginLeft + itemColWidth/2, yPosition + 3, { align: 'center' });

    const description = doc.splitTextToSize(item.description, nameColWidth - 4);
    doc.text(description[0], marginLeft + itemColWidth + 2, yPosition + 3);

    doc.text(item.quantity.toString(), marginLeft + itemColWidth + nameColWidth + qtyColWidth/2, yPosition + 3, { align: 'center' });

    const unitPrice = parseFloat(item.unitPrice);
    const total = parseFloat(item.total);
    doc.text(unitPrice.toFixed(2).replace('.', ','), marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth/2, yPosition + 3, { align: 'center' });
    doc.text(total.toFixed(2).replace('.', ','), marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth + subtotalColWidth/2, yPosition + 3, { align: 'center' });

    // Linhas verticais
    doc.line(marginLeft + itemColWidth, yPosition - 2, marginLeft + itemColWidth, yPosition + 6);
    doc.line(marginLeft + itemColWidth + nameColWidth, yPosition - 2, marginLeft + itemColWidth + nameColWidth, yPosition + 6);
    doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition - 2, marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition + 6);
    doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition - 2, marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition + 6);

    yPosition += 8;
  });

  // Total da seção SERVIÇOS OU PRODUTOS
  drawGrayBackground(marginLeft, yPosition - 2, tableWidth, 6);
  doc.rect(marginLeft, yPosition - 2, tableWidth, 6, 'S');

  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', marginLeft + itemColWidth + 2, yPosition + 2);
  doc.text(quote.items.length.toString(), marginLeft + itemColWidth + nameColWidth + qtyColWidth/2, yPosition + 2, { align: 'center' });

  const totalServices = parseFloat(quote.total);
  doc.text(totalServices.toFixed(2).replace('.', ','), marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth + subtotalColWidth/2, yPosition + 2, { align: 'center' });

  // Linhas verticais
  doc.line(marginLeft + itemColWidth, yPosition - 2, marginLeft + itemColWidth, yPosition + 4);
  doc.line(marginLeft + itemColWidth + nameColWidth, yPosition - 2, marginLeft + itemColWidth + nameColWidth, yPosition + 4);
  doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition - 2, marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition + 4);
  doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition - 2, marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition + 4);

  yPosition += 10;

  // ========== PRAZO DE ENTREGA ==========

  drawGrayBackground(marginLeft, yPosition - 2, pageWidth - marginLeft - marginRight, 6);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PRAZO DE ENTREGA:', marginLeft + 2, yPosition + 2);
  doc.text(quote.executionDeadline || 'A definir', marginLeft + 50, yPosition + 2);
  yPosition += 10;

  // ========== VALIDADE DO ORÇAMENTO ==========

  drawGrayBackground(marginLeft, yPosition - 2, pageWidth - marginLeft - marginRight, 6);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('VALIDADE DO ORÇAMENTO:', marginLeft + 2, yPosition + 2);
  
  // Calcular data de validade (30 dias a partir de hoje)
  const validityDate = addDays(new Date(), 30);
  const validityDateFormatted = format(validityDate, 'dd/MM/yyyy', { locale: ptBR });
  doc.text(validityDateFormatted, marginLeft + 65, yPosition + 2);
  yPosition += 10;

  // ========== RESUMO FINANCEIRO ==========

  if (checkPageBreak(25)) {
    addNewPage();
  }

  // Totais no lado direito
  const summaryX = pageWidth - 80;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SERVIÇOS:', summaryX, yPosition, { align: 'right' });
  doc.text(`${totalServices.toFixed(2).replace('.', ',')}`, summaryX + 25, yPosition, { align: 'right' });
  yPosition += 5;

  doc.text('DESCONTOS:', summaryX, yPosition, { align: 'right' });
  doc.text('0,00', summaryX + 25, yPosition, { align: 'right' });
  yPosition += 5;

  // Total geral
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', summaryX, yPosition, { align: 'right' });
  doc.text(`R$ ${totalServices.toFixed(2).replace('.', ',')}`, summaryX + 25, yPosition, { align: 'right' });
  yPosition += 12;

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
        doc.text(line, leftColumnX + (index === 0 ? 25 : 0), additionalInfoY + (index * 3.5));
      });
      additionalInfoY += Math.max(6, obsLines.length * 3.5);
    }

    // Coluna direita
    let rightInfoY = yPosition;
    if (quote.paymentTerms) {
      doc.text('Condições de Pagamento:', rightColumnX, rightInfoY);
      rightInfoY += 6;
      const paymentLines = doc.splitTextToSize(quote.paymentTerms, 80);
      paymentLines.forEach((line: string, index: number) => {
        doc.text(line, rightColumnX, rightInfoY + (index * 3.5));
      });
      rightInfoY += Math.max(6, paymentLines.length * 3.5) + 4;
    }

    if (quote.warranty) {
      doc.text('Garantia:', rightColumnX, rightInfoY);
      rightInfoY += 4;
      const warrantyLines = doc.splitTextToSize(quote.warranty, 80);
      warrantyLines.forEach((line: string, index: number) => {
        doc.text(line, rightColumnX, rightInfoY + (index * 3.5));
      });
      rightInfoY += Math.max(6, warrantyLines.length * 3.5);
    }

    yPosition = Math.max(additionalInfoY, rightInfoY) + 4;
  }

  // ========== FRASE DE CORTESIA ==========

  if (checkPageBreak(35)) {
    addNewPage();
  }

  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Fico à disposição para dúvidas e aguardo sua aprovação.', marginLeft, yPosition);
  yPosition += 16; // Espaço duplo antes do traço

  // ========== ASSINATURA SEM RETÂNGULO ==========

  // Linha para assinatura acima do nome
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, yPosition, marginLeft + 80, yPosition);
  yPosition += 8;

  // Dados do usuário na assinatura
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(businessName, marginLeft, yPosition);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  let signatureY = yPosition + 5;

  if ((user as any).address) {
    const address = `${(user as any).address}${(user as any).number ? `, ${(user as any).number}` : ''}`;
    doc.text(address, marginLeft, signatureY);
    signatureY += 3.5;

    if ((user as any).city && (user as any).state) {
      doc.text(`${(user as any).city}/${(user as any).state} - CEP: ${(user as any).cep || '00000-000'}`, marginLeft, signatureY);
      signatureY += 3.5;
    }
  }

  const signatureContactInfo = [];
  if ((user as any).cpfCnpj) {
    signatureContactInfo.push(`CNPJ: ${formatCPF((user as any).cpfCnpj)}`);
  }
  if ((user as any).phone) {
    signatureContactInfo.push(`Telefone: ${formatPhoneNumber((user as any).phone)}`);
  }
  if (user.email) {
    signatureContactInfo.push(`Email: ${user.email}`);
  }

  signatureContactInfo.forEach(info => {
    doc.text(info, marginLeft, signatureY);
    signatureY += 3.5;
  });

  signatureY += 3;

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
