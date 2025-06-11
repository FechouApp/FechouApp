import jsPDF from 'jspdf';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { QuoteWithDetails, User } from '@/types';
import { formatPhone, formatCPF, formatCEP } from './utils';
import fechouLogoPath from "@assets/fundo transparente cortado.png";

interface PDFGeneratorOptions {
  quote: QuoteWithDetails;
  user: User;
  isUserPremium: boolean;
}

export async function generateQuotePDF({ quote, user, isUserPremium }: PDFGeneratorOptions): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Margens otimizadas
  const marginTop = 10;
  const marginBottom = 20;
  const marginLeft = 15;
  const marginRight = 15;

  let yPosition = marginTop;
  let currentPage = 1;

  // Função para verificar se precisa de nova página
  const checkPageBreak = (requiredSpace: number): boolean => {
    return (yPosition + requiredSpace) > (pageHeight - marginBottom);
  };

  // Função para adicionar marca d'água para usuários gratuitos
  const addWatermark = () => {
    if (!isUserPremium) {
      try {
        const logoSize = 104; // 80 * 1.3 = 104
        const logoX = (pageWidth - logoSize) / 2;
        const logoY = (pageHeight - logoSize) / 2;
        
        doc.saveGraphicsState();
        doc.setGState({ opacity: 0.08 });
        doc.addImage(fechouLogoPath, 'PNG', logoX, logoY, logoSize, logoSize);
        doc.restoreGraphicsState();
      } catch (error) {
        console.error('Erro ao adicionar marca d\'água:', error);
      }
    }
  };

  // Função para adicionar nova página
  const addNewPage = () => {
    doc.addPage();
    currentPage++;
    yPosition = marginTop;
    addWatermark();
  };

  // Função para desenhar linha horizontal
  const drawHorizontalLine = (y: number, startX = marginLeft, endX = pageWidth - marginRight, thickness = 0.3) => {
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(thickness);
    doc.line(startX, y, endX, y);
  };

  // Função para formatar telefone
  const formatPhoneNumber = (phone: string): string => {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length === 11) {
      return `(${cleanPhone.substring(0,2)}) ${cleanPhone.substring(2,7)}-${cleanPhone.substring(7)}`;
    } else if (cleanPhone.length === 10) {
      return `(${cleanPhone.substring(0,2)}) ${cleanPhone.substring(2,6)}-${cleanPhone.substring(6)}`;
    }
    return phone;
  };

  // ========== CABEÇALHO COM LOGO MAIOR ==========

  const businessName = user.businessName || `${user.firstName} ${user.lastName}`.trim();
  
  // Logo da empresa grande (se disponível)
  let logoHeight = 0;
  if ((user as any)?.logoUrl) {
    try {
      const logoSize = 30;
      const logoUrl = (user as any).logoUrl;
      if (logoUrl && logoUrl.trim() !== '') {
        let format = 'JPEG';
        if (logoUrl.includes('data:image/png')) {
          format = 'PNG';
        } else if (logoUrl.includes('data:image/gif')) {
          format = 'GIF';
        }
        doc.addImage(logoUrl, format, marginLeft, yPosition, logoSize, logoSize);
        logoHeight = logoSize;
      }
    } catch (error) {
      console.error('Erro ao carregar logo da empresa:', error);
    }
  }

  // Se não tem logo da empresa e é plano premium, deixar espaço reservado
  // Se é plano gratuito, não mostrar nenhum logo no cabeçalho
  if (logoHeight === 0 && !isUserPremium) {
    logoHeight = 0; // Não reservar espaço para logo em plano gratuito
  } else if (logoHeight === 0 && isUserPremium) {
    logoHeight = 20; // Reservar espaço mínimo para logo em plano premium
  }

  // Informações da empresa - posição depende se há logo
  const textStartX = logoHeight > 0 ? marginLeft + 80 : marginLeft;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(businessName, textStartX, yPosition + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  let infoY = yPosition + 12;

  // Endereço compacto
  if ((user as any).address) {
    const address = `${(user as any).address}${(user as any).number ? `, ${(user as any).number}` : ''}`;
    doc.text(address, textStartX, infoY);
    infoY += 3;

    if ((user as any).city && (user as any).state) {
      doc.text(`${(user as any).city}/${(user as any).state} - CEP: ${(user as any).cep || '00000-000'}`, textStartX, infoY);
      infoY += 3;
    }
  }

  // Contatos em linha compacta
  const contacts = [];
  if ((user as any).cpfCnpj) contacts.push(`CNPJ: ${formatCPF((user as any).cpfCnpj)}`);
  if ((user as any).phone) contacts.push(`Tel: ${formatPhoneNumber((user as any).phone)}`);
  if (user.email) contacts.push(`Email: ${user.email}`);
  
  contacts.forEach(contact => {
    doc.text(contact, textStartX, infoY);
    infoY += 3;
  });

  yPosition = Math.max(yPosition + logoHeight + 5, infoY + 2);

  // ========== TÍTULO CENTRALIZADO ==========

  drawHorizontalLine(yPosition, marginLeft, pageWidth - marginRight, 0.5);
  yPosition += 6;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const title = 'ORÇAMENTO';
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, (pageWidth - titleWidth) / 2, yPosition);

  // Número do orçamento à direita
  doc.setFontSize(10);
  doc.text(`Nº ${quote.quoteNumber}`, pageWidth - marginRight, yPosition, { align: 'right' });

  yPosition += 8;

  // Data compacta
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  const createdDate = format(new Date(quote.createdAt || new Date()), 'dd/MM/yyyy', { locale: ptBR });
  const validDate = format(new Date(quote.validUntil || new Date()), 'dd/MM/yyyy', { locale: ptBR });
  
  doc.text(`Data: ${createdDate}`, marginLeft, yPosition);
  doc.text(`Válido até: ${validDate}`, pageWidth - marginRight, yPosition, { align: 'right' });

  yPosition += 4;
  drawHorizontalLine(yPosition, marginLeft, pageWidth - marginRight, 0.5);
  yPosition += 8;

  // ========== DADOS DO CLIENTE COMPACTOS ==========

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE:', marginLeft, yPosition);
  
  doc.setFont('helvetica', 'normal');
  doc.text(quote.client.name, marginLeft + 20, yPosition);
  yPosition += 4;

  // Linha de contatos do cliente
  const clientContacts = [];
  if (quote.client.phone) clientContacts.push(`Tel: ${formatPhoneNumber(quote.client.phone)}`);
  if (quote.client.email) clientContacts.push(`Email: ${quote.client.email}`);
  if ((quote.client as any).cpf) clientContacts.push(`CPF: ${formatCPF((quote.client as any).cpf)}`);
  
  if (clientContacts.length > 0) {
    doc.setFontSize(8);
    doc.text(clientContacts.join(' | '), marginLeft, yPosition);
    yPosition += 3;
  }

  // Endereço do cliente se disponível
  if (quote.client.address) {
    let fullAddress = quote.client.address;
    if ((quote.client as any).number) fullAddress += `, ${(quote.client as any).number}`;
    if ((quote.client as any).neighborhood) fullAddress += `, ${(quote.client as any).neighborhood}`;
    if ((quote.client as any).city) fullAddress += `, ${(quote.client as any).city}`;
    if ((quote.client as any).state) fullAddress += `/${(quote.client as any).state}`;
    if ((quote.client as any).cep) fullAddress += ` - ${(quote.client as any).cep}`;
    
    doc.text(fullAddress, marginLeft, yPosition);
    yPosition += 3;
  }

  yPosition += 5;
  drawHorizontalLine(yPosition, marginLeft, pageWidth - marginRight, 0.3);
  yPosition += 8;

  // ========== TABELA DE ITENS COMPACTA ==========

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ITENS DO ORÇAMENTO', marginLeft, yPosition);
  yPosition += 6;

  // Cabeçalho da tabela otimizado
  const tableWidth = pageWidth - marginLeft - marginRight;
  const itemColWidth = 12;
  const descColWidth = 110;
  const qtyColWidth = 18;
  const unitColWidth = 25;
  const totalColWidth = 25;

  // Verificar se precisa de nova página
  if (checkPageBreak(15 + (quote.items?.length || 0) * 6)) {
    addNewPage();
  }

  // Cabeçalho da tabela
  doc.setFillColor(240, 240, 240);
  doc.rect(marginLeft, yPosition, tableWidth, 6, 'F');
  doc.rect(marginLeft, yPosition, tableWidth, 6, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Item', marginLeft + 1, yPosition + 4);
  doc.text('Descrição', marginLeft + itemColWidth + 1, yPosition + 4);
  doc.text('Qtd.', marginLeft + itemColWidth + descColWidth + 1, yPosition + 4);
  doc.text('Vr. Unit.', marginLeft + itemColWidth + descColWidth + qtyColWidth + 1, yPosition + 4);
  doc.text('Total', marginLeft + itemColWidth + descColWidth + qtyColWidth + unitColWidth + 1, yPosition + 4);

  // Linhas verticais do cabeçalho
  const lineHeight = 6;
  doc.line(marginLeft + itemColWidth, yPosition, marginLeft + itemColWidth, yPosition + lineHeight);
  doc.line(marginLeft + itemColWidth + descColWidth, yPosition, marginLeft + itemColWidth + descColWidth, yPosition + lineHeight);
  doc.line(marginLeft + itemColWidth + descColWidth + qtyColWidth, yPosition, marginLeft + itemColWidth + descColWidth + qtyColWidth, yPosition + lineHeight);
  doc.line(marginLeft + itemColWidth + descColWidth + qtyColWidth + unitColWidth, yPosition, marginLeft + itemColWidth + descColWidth + qtyColWidth + unitColWidth, yPosition + lineHeight);

  yPosition += 6;

  // Itens da tabela
  doc.setFont('helvetica', 'normal');
  let itemNumber = 1;
  let subtotal = 0;

  (quote.items || []).forEach((item: any) => {
    if (checkPageBreak(6)) {
      addNewPage();
    }

    const itemTotal = Number(item.quantity) * Number(item.unitPrice);
    subtotal += itemTotal;

    // Linha do item
    doc.rect(marginLeft, yPosition, tableWidth, 6, 'S');

    doc.text(itemNumber.toString(), marginLeft + 1, yPosition + 4);
    
    // Descrição truncada se necessário
    const maxDescWidth = descColWidth - 2;
    const splitDesc = doc.splitTextToSize(item.description, maxDescWidth);
    doc.text(splitDesc[0], marginLeft + itemColWidth + 1, yPosition + 4);
    
    doc.text(item.quantity.toString(), marginLeft + itemColWidth + descColWidth + 1, yPosition + 4);
    doc.text(`R$ ${Number(item.unitPrice).toFixed(2)}`, marginLeft + itemColWidth + descColWidth + qtyColWidth + 1, yPosition + 4);
    doc.text(`R$ ${itemTotal.toFixed(2)}`, marginLeft + itemColWidth + descColWidth + qtyColWidth + unitColWidth + 1, yPosition + 4);

    // Linhas verticais
    doc.line(marginLeft + itemColWidth, yPosition, marginLeft + itemColWidth, yPosition + 6);
    doc.line(marginLeft + itemColWidth + descColWidth, yPosition, marginLeft + itemColWidth + descColWidth, yPosition + 6);
    doc.line(marginLeft + itemColWidth + descColWidth + qtyColWidth, yPosition, marginLeft + itemColWidth + descColWidth + qtyColWidth, yPosition + 6);
    doc.line(marginLeft + itemColWidth + descColWidth + qtyColWidth + unitColWidth, yPosition, marginLeft + itemColWidth + descColWidth + qtyColWidth + unitColWidth, yPosition + 6);

    yPosition += 6;
    itemNumber++;
  });

  yPosition += 4;

  // ========== TOTAIS COMPACTOS ==========

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  // Subtotal
  doc.text('Subtotal:', pageWidth - 50, yPosition, { align: 'right' });
  doc.text(`R$ ${subtotal.toFixed(2)}`, pageWidth - marginRight, yPosition, { align: 'right' });
  yPosition += 4;

  // Desconto se aplicável
  const discount = Number(quote.discount || 0);
  if (discount > 0) {
    doc.text('Desconto:', pageWidth - 50, yPosition, { align: 'right' });
    doc.text(`- R$ ${discount.toFixed(2)}`, pageWidth - marginRight, yPosition, { align: 'right' });
    yPosition += 4;
  }

  // Total final
  drawHorizontalLine(yPosition - 1, pageWidth - 60, pageWidth - marginRight, 0.5);
  doc.setFontSize(12);
  doc.text('TOTAL:', pageWidth - 50, yPosition + 4, { align: 'right' });
  doc.text(`R$ ${parseFloat(quote.total).toFixed(2)}`, pageWidth - marginRight, yPosition + 4, { align: 'right' });

  yPosition += 12;

  // ========== OBSERVAÇÕES COMPACTAS ==========

  if ((quote as any).observations) {
    if (checkPageBreak(15)) {
      addNewPage();
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES:', marginLeft, yPosition);
    yPosition += 4;

    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize((quote as any).observations, pageWidth - marginLeft - marginRight);
    splitNotes.forEach((line: string) => {
      if (checkPageBreak(3)) {
        addNewPage();
      }
      doc.text(line, marginLeft, yPosition);
      yPosition += 3;
    });

    yPosition += 4;
  }

  // ========== PRAZO DE EXECUÇÃO ==========

  if ((quote as any).executionDeadline) {
    if (checkPageBreak(15)) {
      addNewPage();
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PRAZO DE EXECUÇÃO:', marginLeft, yPosition);
    yPosition += 4;

    doc.setFont('helvetica', 'normal');
    const splitTime = doc.splitTextToSize((quote as any).executionDeadline, pageWidth - marginLeft - marginRight);
    splitTime.forEach((line: string) => {
      if (checkPageBreak(3)) {
        addNewPage();
      }
      doc.text(line, marginLeft, yPosition);
      yPosition += 3;
    });

    yPosition += 4;
  }

  // ========== CONDIÇÕES DE PAGAMENTO ==========

  if (quote.paymentTerms) {
    if (checkPageBreak(15)) {
      addNewPage();
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CONDIÇÕES DE PAGAMENTO:', marginLeft, yPosition);
    yPosition += 4;

    doc.setFont('helvetica', 'normal');
    const splitTerms = doc.splitTextToSize(quote.paymentTerms, pageWidth - marginLeft - marginRight);
    splitTerms.forEach((line: string) => {
      if (checkPageBreak(3)) {
        addNewPage();
      }
      doc.text(line, marginLeft, yPosition);
      yPosition += 3;
    });

    yPosition += 4;
  }

  // ========== ASSINATURA COMPACTA ==========

  if (checkPageBreak(20)) {
    addNewPage();
  }

  yPosition += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Aguardo sua aprovação. Obrigado!', marginLeft, yPosition);
  yPosition += 10;

  // Linha para assinatura
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, yPosition, marginLeft + 60, yPosition);
  yPosition += 4;

  // Nome da empresa
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(businessName, marginLeft, yPosition);

  // Aplicar marca d'água na primeira página
  addWatermark();

  // Rodapé
  const footerY = pageHeight - 8;
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('Orçamento gerado pelo Fechou! - www.meufechou.com.br', pageWidth / 2, footerY, { align: 'center' });

  return doc.output('blob');
}

async function generateReceiptPDF({ quote, user, isUserPremium }: PDFGeneratorOptions): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Margens otimizadas
  const marginTop = 10;
  const marginBottom = 20;
  const marginLeft = 15;
  const marginRight = 15;

  let yPosition = marginTop;

  // Função para adicionar marca d'água
  const addWatermark = () => {
    if (!isUserPremium) {
      try {
        const logoSize = 104; // 80 * 1.3 = 104
        const logoX = (pageWidth - logoSize) / 2;
        const logoY = (pageHeight - logoSize) / 2;
        
        doc.saveGraphicsState();
        doc.setGState({ opacity: 0.08 });
        doc.addImage(fechouLogoPath, 'PNG', logoX, logoY, logoSize, logoSize);
        doc.restoreGraphicsState();
      } catch (error) {
        console.error('Erro ao adicionar marca d\'água:', error);
      }
    }
  };

  const formatPhoneNumber = (phone: string): string => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 11) {
      return `(${cleanPhone.substring(0,2)}) ${cleanPhone.substring(2,7)}-${cleanPhone.substring(7)}`;
    } else if (cleanPhone.length === 10) {
      return `(${cleanPhone.substring(0,2)}) ${cleanPhone.substring(2,6)}-${cleanPhone.substring(6)}`;
    }
    return phone;
  };

  // ========== CABEÇALHO COMPACTO ==========

  const businessName = user.businessName || `${user.firstName} ${user.lastName}`.trim();
  
  // Logo da empresa ou sistema
  let logoHeight = 0;
  if ((user as any)?.logoUrl) {
    try {
      const logoSize = 25;
      const logoUrl = (user as any).logoUrl;
      if (logoUrl && logoUrl.trim() !== '') {
        let format = 'JPEG';
        if (logoUrl.includes('data:image/png')) {
          format = 'PNG';
        } else if (logoUrl.includes('data:image/gif')) {
          format = 'GIF';
        }
        doc.addImage(logoUrl, format, marginLeft, yPosition, logoSize, logoSize);
        logoHeight = logoSize;
      }
    } catch (error) {
      console.error('Erro ao carregar logo da empresa:', error);
    }
  }

  // Se não tem logo da empresa e é plano premium, deixar espaço reservado
  // Se é plano gratuito, não mostrar nenhum logo no cabeçalho
  if (logoHeight === 0 && !isUserPremium) {
    logoHeight = 0; // Não reservar espaço para logo em plano gratuito
  } else if (logoHeight === 0 && isUserPremium) {
    logoHeight = 15; // Reservar espaço mínimo para logo em plano premium
  }

  // Informações da empresa - posição depende se há logo
  const textStartX = logoHeight > 0 ? marginLeft + 60 : marginLeft;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(businessName, textStartX, yPosition + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  let currentY = yPosition + 12;
  
  // Endereço e contatos compactos
  const companyInfo = [];
  if ((user as any).address) {
    let fullAddress = (user as any).address;
    if ((user as any).number) fullAddress += `, ${(user as any).number}`;
    if ((user as any).city) fullAddress += `, ${(user as any).city}/${(user as any).state}`;
    companyInfo.push(fullAddress);
  }
  
  const contacts = [];
  if ((user as any).phone) contacts.push(`Tel: ${formatPhoneNumber((user as any).phone)}`);
  if (user.email) contacts.push(`Email: ${user.email}`);
  if ((user as any).cpfCnpj) contacts.push(`CNPJ: ${formatCPF((user as any).cpfCnpj)}`);
  
  companyInfo.forEach(info => {
    doc.text(info, textStartX, currentY);
    currentY += 3;
  });
  
  if (contacts.length > 0) {
    doc.text(contacts.join(' | '), textStartX, currentY);
    currentY += 3;
  }

  yPosition = Math.max(yPosition + logoHeight + 5, currentY + 3);

  // ========== TÍTULO DO RECIBO ==========
  
  doc.setLineWidth(0.5);
  doc.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
  yPosition += 6;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const title = `RECIBO Nº ${quote.quoteNumber}`;
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, (pageWidth - titleWidth) / 2, yPosition);
  
  // Data
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const currentDate = new Date().toLocaleDateString('pt-BR');
  doc.text(currentDate, pageWidth - marginRight, yPosition, { align: 'right' });
  
  yPosition += 8;
  doc.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
  yPosition += 8;

  // ========== DADOS DO CLIENTE COMPACTOS ==========
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE:', marginLeft, yPosition);
  
  doc.setFont('helvetica', 'normal');
  doc.text(quote.client.name, marginLeft + 20, yPosition);
  yPosition += 4;

  const clientInfo = [];
  if (quote.client.phone) clientInfo.push(`Tel: ${formatPhoneNumber(quote.client.phone)}`);
  if (quote.client.email) clientInfo.push(`Email: ${quote.client.email}`);
  if ((quote.client as any).cpf) clientInfo.push(`CPF: ${formatCPF((quote.client as any).cpf)}`);
  
  if (clientInfo.length > 0) {
    doc.setFontSize(8);
    doc.text(clientInfo.join(' | '), marginLeft, yPosition);
    yPosition += 3;
  }

  yPosition += 6;

  // ========== ITENS COMPACTOS ==========
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SERVIÇOS/PRODUTOS:', marginLeft, yPosition);
  yPosition += 6;

  // Cabeçalho da tabela
  const tableWidth = pageWidth - marginLeft - marginRight;
  const itemColWidth = 12;
  const nameColWidth = 100;
  const qtyColWidth = 15;
  const unitPriceColWidth = 25;
  const subtotalColWidth = 25;

  doc.setFillColor(245, 245, 245);
  doc.rect(marginLeft, yPosition, tableWidth, 6, 'F');
  doc.rect(marginLeft, yPosition, tableWidth, 6, 'S');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Item', marginLeft + 1, yPosition + 4);
  doc.text('Descrição', marginLeft + itemColWidth + 1, yPosition + 4);
  doc.text('Qtd.', marginLeft + itemColWidth + nameColWidth + 1, yPosition + 4);
  doc.text('Vr. Unit.', marginLeft + itemColWidth + nameColWidth + qtyColWidth + 1, yPosition + 4);
  doc.text('Subtotal', marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth + 1, yPosition + 4);

  // Linhas verticais
  doc.line(marginLeft + itemColWidth, yPosition, marginLeft + itemColWidth, yPosition + 6);
  doc.line(marginLeft + itemColWidth + nameColWidth, yPosition, marginLeft + itemColWidth + nameColWidth, yPosition + 6);
  doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition, marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition + 6);
  doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition, marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition + 6);

  yPosition += 6;

  // Itens
  doc.setFont('helvetica', 'normal');
  let itemNumber = 1;
  (quote.items || []).forEach((item: any) => {
    const itemTotal = Number(item.quantity) * Number(item.unitPrice);
    
    doc.rect(marginLeft, yPosition, tableWidth, 6, 'S');
    
    doc.text(itemNumber.toString(), marginLeft + 1, yPosition + 4);
    doc.text(item.description, marginLeft + itemColWidth + 1, yPosition + 4);
    doc.text(item.quantity.toString(), marginLeft + itemColWidth + nameColWidth + 1, yPosition + 4);
    doc.text(Number(item.unitPrice).toFixed(2), marginLeft + itemColWidth + nameColWidth + qtyColWidth + 1, yPosition + 4);
    doc.text(itemTotal.toFixed(2), marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth + 1, yPosition + 4);
    
    // Linhas verticais
    doc.line(marginLeft + itemColWidth, yPosition, marginLeft + itemColWidth, yPosition + 6);
    doc.line(marginLeft + itemColWidth + nameColWidth, yPosition, marginLeft + itemColWidth + nameColWidth, yPosition + 6);
    doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition, marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition + 6);
    doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition, marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition + 6);
    
    yPosition += 6;
    itemNumber++;
  });

  yPosition += 6;

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL GERAL:', pageWidth - 60, yPosition, { align: 'right' });
  doc.text(`R$ ${parseFloat(quote.total).toFixed(2)}`, pageWidth - marginRight, yPosition, { align: 'right' });
  yPosition += 12;

  // Declaração
  const totalValue = parseFloat(quote.total);
  const valueInWords = numberToWords(totalValue);
  const declarationText = `Declaro que recebi de ${quote.client.name} o valor de R$ ${totalValue.toFixed(2)} (${valueInWords}), referente aos serviços descritos acima.`;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const splitText = doc.splitTextToSize(declarationText, pageWidth - marginLeft - marginRight);
  splitText.forEach((line: string, index: number) => {
    doc.text(line, marginLeft, yPosition + (index * 3));
  });
  yPosition += splitText.length * 3 + 12;

  // Assinatura
  doc.line(marginLeft, yPosition, marginLeft + 60, yPosition);
  yPosition += 4;
  doc.setFont('helvetica', 'bold');
  doc.text(businessName, marginLeft, yPosition);

  // Aplicar marca d'água
  addWatermark();

  // Rodapé
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Recibo gerado pelo Fechou! - www.meufechou.com.br', pageWidth / 2, pageHeight - 8, { align: 'center' });

  return doc.output('blob');
}

// Helper function para converter número em palavras (simplificada)
function numberToWords(num: number): string {
  if (num === 0) return 'zero reais';
  
  const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  
  if (num < 1000) {
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const u = num % 10;
    
    let result = '';
    if (h > 0) result += hundreds[h];
    if (t > 1) {
      if (result) result += ' e ';
      result += tens[t];
    } else if (t === 1) {
      if (result) result += ' e ';
      result += teens[u];
      return result + ' reais';
    }
    if (u > 0 && t !== 1) {
      if (result) result += ' e ';
      result += units[u];
    }
    return result + ' reais';
  }
  
  return `${num.toFixed(2)} reais`;
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

export { generateReceiptPDF };