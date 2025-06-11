import jsPDF from 'jspdf';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { QuoteWithDetails, User } from '@/types';
import { formatPhone, formatCPF, formatCEP } from './utils';
import fechouLogoPath from "@assets/fundo transparente.png";

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

  // Função para adicionar marca d'água para usuários gratuitos
  const addWatermark = () => {
    if (!isUserPremium) {
      try {
        // Adicionar logo como marca d'água no centro da página
        const logoSize = 80;
        const logoX = (pageWidth - logoSize) / 2;
        const logoY = (pageHeight - logoSize) / 2;
        
        // Salvar estado atual
        doc.saveGraphicsState();
        doc.setGState({ opacity: 0.1 });
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
    addWatermark(); // Adicionar marca d'água na nova página
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
      // Celular: (XX) 9XXXX-XXXX
      return `(${cleanPhone.substring(0,2)}) ${cleanPhone.substring(2,7)}-${cleanPhone.substring(7)}`;
    } else if (cleanPhone.length === 10) {
      // Fixo: (XX) XXXX-XXXX
      return `(${cleanPhone.substring(0,2)}) ${cleanPhone.substring(2,6)}-${cleanPhone.substring(6)}`;
    }
    return phone;
  };

  // ========== CABEÇALHO DA EMPRESA ==========

  const businessName = user.businessName || `${user.firstName} ${user.lastName}`.trim();
  
  // Logo da empresa (se disponível)
  let logoWidth = 0;
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
        logoWidth = logoSize + 5;
        logoHeight = logoSize;
      }
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
      // Fallback para iniciais se o logo falhar
      const logoSize = 20;
      const initials = businessName.split(' ').map((word: string) => word.charAt(0)).join('').substring(0, 2).toUpperCase();
      
      doc.setFillColor(70, 130, 180);
      doc.circle(marginLeft + logoSize/2, yPosition + logoSize/2, 10, 'F');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(initials, marginLeft + logoSize/2, yPosition + logoSize/2 + 2, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      logoWidth = logoSize + 5;
      logoHeight = logoSize;
    }
  } else {
    // Logo com iniciais se não houver logoUrl
    const logoSize = 20;
    const initials = businessName.split(' ').map((word: string) => word.charAt(0)).join('').substring(0, 2).toUpperCase();
    
    doc.setFillColor(70, 130, 180);
    doc.circle(marginLeft + logoSize/2, yPosition + logoSize/2, 10, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(initials, marginLeft + logoSize/2, yPosition + logoSize/2 + 2, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    
    logoWidth = logoSize + 5;
    logoHeight = logoSize;
  }

  // Informações da empresa ao lado do logotipo
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');

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
  yPosition += 8;

  // ========== TÍTULO DO ORÇAMENTO ==========

  drawHorizontalLine(yPosition);
  yPosition += 8;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO', marginLeft, yPosition);

  // Número do orçamento à direita
  doc.setFontSize(12);
  doc.text(`Nº ${quote.quoteNumber}`, pageWidth - marginRight, yPosition, { align: 'right' });

  yPosition += 12;

  // Data de criação e validade
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const createdDate = format(new Date(quote.createdAt), 'dd/MM/yyyy', { locale: ptBR });
  const validDate = format(new Date(quote.validUntil), 'dd/MM/yyyy', { locale: ptBR });
  
  doc.text(`Data: ${createdDate}`, marginLeft, yPosition);
  doc.text(`Válido até: ${validDate}`, pageWidth - marginRight, yPosition, { align: 'right' });

  yPosition += 8;
  drawHorizontalLine(yPosition);
  yPosition += 12;

  // ========== DADOS DO CLIENTE ==========

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', marginLeft, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Nome do cliente
  doc.text(`Nome: ${quote.client.name}`, marginLeft, yPosition);
  yPosition += 5;

  // Email e telefone
  if (quote.client.email) {
    doc.text(`E-mail: ${quote.client.email}`, marginLeft, yPosition);
    yPosition += 5;
  }

  if (quote.client.phone) {
    doc.text(`Telefone: ${formatPhoneNumber(quote.client.phone)}`, marginLeft, yPosition);
    yPosition += 5;
  }

  // CPF se disponível
  if ((quote.client as any).cpf) {
    doc.text(`CPF: ${formatCPF((quote.client as any).cpf)}`, marginLeft, yPosition);
    yPosition += 5;
  }

  // Endereço se disponível
  if (quote.client.address) {
    let fullAddress = quote.client.address;
    if ((quote.client as any).number) fullAddress += `, ${(quote.client as any).number}`;
    if ((quote.client as any).neighborhood) fullAddress += `, ${(quote.client as any).neighborhood}`;
    doc.text(`Endereço: ${fullAddress}`, marginLeft, yPosition);
    yPosition += 5;

    // Cidade, estado e CEP
    if ((quote.client as any).city || (quote.client as any).state || (quote.client as any).cep) {
      let cityStateZip = '';
      if ((quote.client as any).city) cityStateZip += (quote.client as any).city;
      if ((quote.client as any).state) cityStateZip += (cityStateZip ? '/' : '') + (quote.client as any).state;
      if ((quote.client as any).cep) cityStateZip += (cityStateZip ? ' - CEP: ' : 'CEP: ') + (quote.client as any).cep;
      if (cityStateZip) {
        doc.text(cityStateZip, marginLeft, yPosition);
        yPosition += 5;
      }
    }
  }

  yPosition += 8;
  drawHorizontalLine(yPosition);
  yPosition += 12;

  // ========== ITENS DO ORÇAMENTO ==========

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ITENS DO ORÇAMENTO', marginLeft, yPosition);
  yPosition += 10;

  // Cabeçalho da tabela
  const tableStartY = yPosition;
  const tableWidth = pageWidth - marginLeft - marginRight;
  const itemColWidth = 15;
  const descColWidth = 100;
  const qtyColWidth = 15;
  const unitColWidth = 25;
  const totalColWidth = 25;

  // Verificar se precisa de nova página para a tabela
  if (checkPageBreak(20 + (quote.items?.length || 0) * 8)) {
    addNewPage();
  }

  // Cabeçalho da tabela com fundo cinza
  drawGrayBackground(marginLeft, yPosition, tableWidth, 8);
  doc.rect(marginLeft, yPosition, tableWidth, 8, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Item', marginLeft + 2, yPosition + 5);
  doc.text('Descrição', marginLeft + itemColWidth + 2, yPosition + 5);
  doc.text('Qtd.', marginLeft + itemColWidth + descColWidth + 2, yPosition + 5);
  doc.text('Vr. Unit.', marginLeft + itemColWidth + descColWidth + qtyColWidth + 2, yPosition + 5);
  doc.text('Total', marginLeft + itemColWidth + descColWidth + qtyColWidth + unitColWidth + 2, yPosition + 5);

  // Linhas verticais do cabeçalho
  doc.line(marginLeft + itemColWidth, yPosition, marginLeft + itemColWidth, yPosition + 8);
  doc.line(marginLeft + itemColWidth + descColWidth, yPosition, marginLeft + itemColWidth + descColWidth, yPosition + 8);
  doc.line(marginLeft + itemColWidth + descColWidth + qtyColWidth, yPosition, marginLeft + itemColWidth + descColWidth + qtyColWidth, yPosition + 8);
  doc.line(marginLeft + itemColWidth + descColWidth + qtyColWidth + unitColWidth, yPosition, marginLeft + itemColWidth + descColWidth + qtyColWidth + unitColWidth, yPosition + 8);

  yPosition += 8;

  // Itens da tabela
  doc.setFont('helvetica', 'normal');
  let itemNumber = 1;
  let subtotal = 0;

  (quote.items || []).forEach((item: any) => {
    if (checkPageBreak(8)) {
      addNewPage();
    }

    const itemTotal = Number(item.quantity) * Number(item.unitPrice);
    subtotal += itemTotal;

    // Linha do item
    doc.rect(marginLeft, yPosition, tableWidth, 8, 'S');

    doc.text(itemNumber.toString(), marginLeft + 2, yPosition + 5);
    
    // Quebrar descrição se muito longa
    const maxDescWidth = descColWidth - 4;
    const splitDesc = doc.splitTextToSize(item.description, maxDescWidth);
    doc.text(splitDesc[0], marginLeft + itemColWidth + 2, yPosition + 5);
    
    doc.text(item.quantity.toString(), marginLeft + itemColWidth + descColWidth + 2, yPosition + 5);
    doc.text(`R$ ${Number(item.unitPrice).toFixed(2)}`, marginLeft + itemColWidth + descColWidth + qtyColWidth + 2, yPosition + 5);
    doc.text(`R$ ${itemTotal.toFixed(2)}`, marginLeft + itemColWidth + descColWidth + qtyColWidth + unitColWidth + 2, yPosition + 5);

    // Linhas verticais
    doc.line(marginLeft + itemColWidth, yPosition, marginLeft + itemColWidth, yPosition + 8);
    doc.line(marginLeft + itemColWidth + descColWidth, yPosition, marginLeft + itemColWidth + descColWidth, yPosition + 8);
    doc.line(marginLeft + itemColWidth + descColWidth + qtyColWidth, yPosition, marginLeft + itemColWidth + descColWidth + qtyColWidth, yPosition + 8);
    doc.line(marginLeft + itemColWidth + descColWidth + qtyColWidth + unitColWidth, yPosition, marginLeft + itemColWidth + descColWidth + qtyColWidth + unitColWidth, yPosition + 8);

    yPosition += 8;
    itemNumber++;
  });

  yPosition += 8;

  // ========== TOTAIS ==========

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');

  // Subtotal
  doc.text('Subtotal:', pageWidth - 60, yPosition, { align: 'right' });
  doc.text(`R$ ${subtotal.toFixed(2)}`, pageWidth - marginRight, yPosition, { align: 'right' });
  yPosition += 6;

  // Desconto se aplicável
  const discount = Number(quote.discount || 0);
  if (discount > 0) {
    doc.text('Desconto:', pageWidth - 60, yPosition, { align: 'right' });
    doc.text(`- R$ ${discount.toFixed(2)}`, pageWidth - marginRight, yPosition, { align: 'right' });
    yPosition += 6;
  }

  // Total final
  drawHorizontalLine(yPosition - 2, pageWidth - 70, pageWidth - marginRight);
  doc.setFontSize(14);
  doc.text('TOTAL:', pageWidth - 60, yPosition + 4, { align: 'right' });
  doc.text(`R$ ${parseFloat(quote.total).toFixed(2)}`, pageWidth - marginRight, yPosition + 4, { align: 'right' });

  yPosition += 20;

  // ========== OBSERVAÇÕES ==========

  if (quote.notes) {
    if (checkPageBreak(20)) {
      addNewPage();
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES:', marginLeft, yPosition);
    yPosition += 6;

    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(quote.notes, pageWidth - marginLeft - marginRight);
    splitNotes.forEach((line: string) => {
      if (checkPageBreak(4)) {
        addNewPage();
      }
      doc.text(line, marginLeft, yPosition);
      yPosition += 4;
    });

    yPosition += 8;
  }

  // ========== CONDIÇÕES DE PAGAMENTO ==========

  if (quote.paymentTerms) {
    if (checkPageBreak(20)) {
      addNewPage();
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CONDIÇÕES DE PAGAMENTO:', marginLeft, yPosition);
    yPosition += 6;

    doc.setFont('helvetica', 'normal');
    const splitTerms = doc.splitTextToSize(quote.paymentTerms, pageWidth - marginLeft - marginRight);
    splitTerms.forEach((line: string) => {
      if (checkPageBreak(4)) {
        addNewPage();
      }
      doc.text(line, marginLeft, yPosition);
      yPosition += 4;
    });

    yPosition += 8;
  }

  // ========== GARANTIA ==========

  if ((quote as any).warranty) {
    if (checkPageBreak(20)) {
      addNewPage();
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('GARANTIA:', marginLeft, yPosition);
    yPosition += 6;

    doc.setFont('helvetica', 'normal');
    const splitWarranty = doc.splitTextToSize((quote as any).warranty, pageWidth - marginLeft - marginRight);
    splitWarranty.forEach((line: string) => {
      if (checkPageBreak(4)) {
        addNewPage();
      }
      doc.text(line, marginLeft, yPosition);
      yPosition += 4;
    });

    yPosition += 8;
  }

  // ========== MENSAGEM FINAL ==========

  if (checkPageBreak(30)) {
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

  // Aplicar marca d'água na primeira página para usuários gratuitos
  addWatermark();

  // Rodapé
  const footerY = pageHeight - 10;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Orçamento gerado pelo Fechou! - www.meufechou.com.br', pageWidth / 2, footerY, { align: 'center' });

  // Converter para blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
}

async function generateReceiptPDF({ quote, user, isUserPremium }: PDFGeneratorOptions): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Margens
  const marginTop = 15;
  const marginBottom = 25;
  const marginLeft = 15;
  const marginRight = 15;

  let yPosition = marginTop;

  // Helper functions
  const drawGrayBackground = (x: number, y: number, width: number, height: number) => {
    doc.setFillColor(240, 240, 240);
    doc.rect(x, y, width, height, 'F');
  };

  // Função para adicionar marca d'água para usuários gratuitos
  const addWatermark = () => {
    if (!isUserPremium) {
      try {
        // Adicionar logo como marca d'água no centro da página
        const logoSize = 80;
        const logoX = (pageWidth - logoSize) / 2;
        const logoY = (pageHeight - logoSize) / 2;
        
        // Salvar estado atual
        doc.saveGraphicsState();
        doc.setGState({ opacity: 0.1 });
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

  // ========== CABEÇALHO DA EMPRESA ==========

  const businessName = user.businessName || `${user.firstName} ${user.lastName}`.trim();
  
  // Logo da empresa (se disponível)
  let logoWidth = 0;
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
        logoWidth = logoSize + 5;
        logoHeight = logoSize;
      }
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
      // Fallback para iniciais se o logo falhar
      const logoSize = 20;
      const initials = businessName.split(' ').map((word: string) => word.charAt(0)).join('').substring(0, 2).toUpperCase();
      
      doc.setFillColor(70, 130, 180);
      doc.circle(marginLeft + logoSize/2, yPosition + logoSize/2, 10, 'F');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(initials, marginLeft + logoSize/2, yPosition + logoSize/2 + 2, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      logoWidth = logoSize + 5;
      logoHeight = logoSize;
    }
  } else {
    // Logo com iniciais se não houver logoUrl
    const logoSize = 20;
    const initials = businessName.split(' ').map((word: string) => word.charAt(0)).join('').substring(0, 2).toUpperCase();
    
    doc.setFillColor(70, 130, 180);
    doc.circle(marginLeft + logoSize/2, yPosition + logoSize/2, 10, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(initials, marginLeft + logoSize/2, yPosition + logoSize/2 + 2, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    
    logoWidth = logoSize + 5;
    logoHeight = logoSize;
  }

  // Informações da empresa ao lado do logo
  const textStartX = marginLeft + logoWidth;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(businessName, textStartX, yPosition + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  let currentY = yPosition + 14;
  
  // Endereço completo
  if ((user as any).address) {
    let fullAddress = (user as any).address;
    if ((user as any).number) fullAddress += `, ${(user as any).number}`;
    if ((user as any).neighborhood) fullAddress += `, ${(user as any).neighborhood}`;
    doc.text(fullAddress, textStartX, currentY);
    currentY += 4;
    
    // Cidade, estado e CEP
    if ((user as any).city || (user as any).state || (user as any).cep) {
      let cityStateZip = '';
      if ((user as any).city) cityStateZip += (user as any).city;
      if ((user as any).state) cityStateZip += (cityStateZip ? '/' : '') + (user as any).state;
      if ((user as any).cep) cityStateZip += (cityStateZip ? ' - CEP: ' : 'CEP: ') + (user as any).cep;
      if (cityStateZip) {
        doc.text(cityStateZip, textStartX, currentY);
        currentY += 4;
      }
    }
  }
  
  // Informações de contato
  let contactInfo = '';
  if ((user as any).phone) {
    contactInfo += `Tel: ${formatPhoneNumber((user as any).phone)}`;
  }
  if (user.email) {
    contactInfo += (contactInfo ? '  ' : '') + `Email: ${user.email}`;
  }
  if ((user as any).cpfCnpj) {
    contactInfo += (contactInfo ? '  ' : '') + `${(user as any).cpfCnpj.length <= 14 ? 'CPF' : 'CNPJ'}: ${formatCPF((user as any).cpfCnpj)}`;
  }
  if (contactInfo) {
    doc.text(contactInfo, textStartX, currentY);
  }

  // Linha de contorno do cabeçalho
  doc.setLineWidth(0.5);
  doc.rect(marginLeft, yPosition, pageWidth - marginLeft - marginRight, 30, 'S');

  yPosition += 40;

  // ========== TÍTULO DO RECIBO ==========
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const title = `RECIBO Nº ${quote.quoteNumber}`;
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, (pageWidth - titleWidth) / 2, yPosition);
  
  // Data no canto direito
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const currentDate = new Date().toLocaleDateString('pt-BR');
  doc.text(currentDate, pageWidth - marginRight, yPosition, { align: 'right' });
  
  yPosition += 20;

  // ========== DADOS DO CLIENTE ==========
  
  // Fundo cinza para a seção DADOS DO CLIENTE
  drawGrayBackground(marginLeft, yPosition, pageWidth - marginLeft - marginRight, 8);
  
  // Linha de contorno
  doc.setLineWidth(0.5);
  doc.rect(marginLeft, yPosition, pageWidth - marginLeft - marginRight, 8, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', marginLeft + 2, yPosition + 5);
  
  yPosition += 15;

  // Informações do cliente em duas colunas
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  let clientY = yPosition;
  
  // Coluna esquerda - Dados básicos
  doc.text(`Cliente: ${quote.client.name}`, marginLeft, clientY);
  clientY += 4;
  
  if (quote.client.phone) {
    doc.text(`Telefone: ${formatPhoneNumber(quote.client.phone)}`, marginLeft, clientY);
    clientY += 4;
  }
  
  if ((quote.client as any).cpf) {
    doc.text(`CPF: ${formatCPF((quote.client as any).cpf)}`, marginLeft, clientY);
    clientY += 4;
  }
  
  // Endereço do cliente se disponível
  if (quote.client.address) {
    let clientFullAddress = quote.client.address;
    if ((quote.client as any).number) clientFullAddress += `, ${(quote.client as any).number}`;
    if ((quote.client as any).neighborhood) clientFullAddress += `, ${(quote.client as any).neighborhood}`;
    doc.text(`Endereço: ${clientFullAddress}`, marginLeft, clientY);
    clientY += 4;
    
    if ((quote.client as any).city || (quote.client as any).state || (quote.client as any).cep) {
      let clientCityStateZip = '';
      if ((quote.client as any).city) clientCityStateZip += (quote.client as any).city;
      if ((quote.client as any).state) clientCityStateZip += (clientCityStateZip ? '/' : '') + (quote.client as any).state;
      if ((quote.client as any).cep) clientCityStateZip += (clientCityStateZip ? ' - CEP: ' : 'CEP: ') + (quote.client as any).cep;
      if (clientCityStateZip) {
        doc.text(clientCityStateZip, marginLeft, clientY);
        clientY += 4;
      }
    }
  }
  
  // Coluna direita - E-mail e observações
  const rightColumnX = pageWidth / 2 + 20;
  let rightY = yPosition;
  
  if (quote.client.email) {
    doc.text(`E-mail: ${quote.client.email}`, rightColumnX, rightY);
    rightY += 4;
  }
  
  if ((quote.client as any).notes) {
    doc.text(`Observações: ${(quote.client as any).notes}`, rightColumnX, rightY);
    rightY += 4;
  }
  
  // Ajustar yPosition para o maior valor entre as duas colunas
  yPosition = Math.max(clientY, rightY);
  
  yPosition += 15;

  // ========== SERVIÇOS OU PRODUTOS ==========
  
  // Fundo cinza para a seção SERVIÇOS OU PRODUTOS
  drawGrayBackground(marginLeft, yPosition, pageWidth - marginLeft - marginRight, 8);
  
  // Linha de contorno
  doc.setLineWidth(0.5);
  doc.rect(marginLeft, yPosition, pageWidth - marginLeft - marginRight, 8, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SERVIÇOS OU PRODUTOS', marginLeft + 2, yPosition + 5);
  
  yPosition += 15;

  // Cabeçalho da tabela de itens
  const tableWidth = pageWidth - marginLeft - marginRight;
  const itemColWidth = 15;
  const nameColWidth = 80;
  const qtyColWidth = 20;
  const unitPriceColWidth = 25;
  const subtotalColWidth = 25;

  // Linha superior da tabela
  doc.setLineWidth(0.5);
  doc.rect(marginLeft, yPosition, tableWidth, 8, 'S');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ITEM', marginLeft + itemColWidth/2, yPosition + 5, { align: 'center' });
  doc.text('NOME', marginLeft + itemColWidth + nameColWidth/2, yPosition + 5, { align: 'center' });
  doc.text('QTD.', marginLeft + itemColWidth + nameColWidth + qtyColWidth/2, yPosition + 5, { align: 'center' });
  doc.text('VR. UNIT.', marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth/2, yPosition + 5, { align: 'center' });
  doc.text('SUBTOTAL', marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth + subtotalColWidth/2, yPosition + 5, { align: 'center' });

  // Linhas verticais do cabeçalho
  doc.line(marginLeft + itemColWidth, yPosition, marginLeft + itemColWidth, yPosition + 8);
  doc.line(marginLeft + itemColWidth + nameColWidth, yPosition, marginLeft + itemColWidth + nameColWidth, yPosition + 8);
  doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition, marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition + 8);
  doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition, marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition + 8);

  yPosition += 8;

  // Itens da tabela
  doc.setFont('helvetica', 'normal');
  let itemNumber = 1;
  (quote.items || []).forEach((item: any) => {
    const itemTotal = Number(item.quantity) * Number(item.unitPrice);
    
    // Linha para o item
    doc.rect(marginLeft, yPosition, tableWidth, 8, 'S');
    
    // Conteúdo do item
    doc.text(itemNumber.toString(), marginLeft + itemColWidth/2, yPosition + 5, { align: 'center' });
    doc.text(item.description, marginLeft + itemColWidth + 2, yPosition + 5);
    doc.text(item.quantity.toString(), marginLeft + itemColWidth + nameColWidth + qtyColWidth/2, yPosition + 5, { align: 'center' });
    doc.text(Number(item.unitPrice).toFixed(2), marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth/2, yPosition + 5, { align: 'center' });
    doc.text(itemTotal.toFixed(2), marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth + subtotalColWidth/2, yPosition + 5, { align: 'center' });
    
    // Linhas verticais
    doc.line(marginLeft + itemColWidth, yPosition, marginLeft + itemColWidth, yPosition + 8);
    doc.line(marginLeft + itemColWidth + nameColWidth, yPosition, marginLeft + itemColWidth + nameColWidth, yPosition + 8);
    doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition, marginLeft + itemColWidth + nameColWidth + qtyColWidth, yPosition + 8);
    doc.line(marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition, marginLeft + itemColWidth + nameColWidth + qtyColWidth + unitPriceColWidth, yPosition + 8);
    
    yPosition += 8;
    itemNumber++;
  });

  yPosition += 15;

  // Total geral
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL GERAL:', pageWidth - 80, yPosition, { align: 'right' });
  doc.text(`R$ ${parseFloat(quote.total).toFixed(2)}`, pageWidth - marginRight, yPosition, { align: 'right' });
  yPosition += 20;

  // Texto de declaração
  const totalValue = parseFloat(quote.total);
  const valueInWords = numberToWords(totalValue);
  const declarationText = `Declaro que recebi de ${quote.client.name} o valor de R$ ${totalValue.toFixed(2)} (${valueInWords}), referente aos serviços descritos acima.`;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const splitText = doc.splitTextToSize(declarationText, pageWidth - marginLeft - marginRight);
  splitText.forEach((line: string, index: number) => {
    doc.text(line, marginLeft, yPosition + (index * 4));
  });
  yPosition += splitText.length * 4 + 20;

  // Linha para assinatura
  doc.text('_________________________________', marginLeft, yPosition);
  yPosition += 8;
  doc.text(businessName, marginLeft, yPosition);

  // Aplicar marca d'água para usuários gratuitos
  addWatermark();

  // Rodapé
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Recibo gerado pelo Fechou! - www.meufechou.com.br', pageWidth / 2, pageHeight - 15, { align: 'center' });

  return doc.output('blob');
}

// Helper function to convert number to words (simplified)
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
  
  return `${num.toFixed(2)} reais`; // Fallback para valores maiores
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