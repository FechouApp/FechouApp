
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
  
  // Margens adaptativas
  const marginTop = 15;
  const marginBottom = 25;
  const marginLeft = 20;
  const marginRight = 20;
  const usableHeight = pageHeight - marginTop - marginBottom;
  
  let yPosition = marginTop;
  let currentPage = 1;
  let totalPages = 1; // Será calculado dinamicamente

  // Função para verificar se precisa de nova página
  const checkPageBreak = (requiredSpace: number): boolean => {
    return (yPosition + requiredSpace) > (pageHeight - marginBottom);
  };

  // Função para adicionar nova página
  const addNewPage = () => {
    doc.addPage();
    currentPage++;
    yPosition = marginTop;
    
    // Repetir cabeçalho na nova página se for Premium
    if (isUserPremium) {
      addHeader(true);
    }
  };

  // Função para adicionar cabeçalho
  const addHeader = (isNewPage = false) => {
    const startY = yPosition;
    
    // Logo Premium no canto superior direito
    if (isUserPremium && (user as any)?.logoUrl) {
      try {
        const logoSize = 25;
        const logoX = pageWidth - logoSize - marginRight;
        const logoY = yPosition;
        
        const logoUrl = (user as any).logoUrl;
        if (logoUrl && logoUrl.trim() !== '') {
          let format = 'JPEG';
          if (logoUrl.includes('data:image/png')) {
            format = 'PNG';
          } else if (logoUrl.includes('data:image/gif')) {
            format = 'GIF';
          }
          
          doc.addImage(logoUrl, format, logoX, logoY, logoSize, logoSize);
        }
      } catch (error) {
        console.error('Erro ao carregar logo:', error);
      }
    }

    yPosition += isNewPage ? 8 : 12;
    
    // Título do documento
    if (isUserPremium) {
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('ORÇAMENTO', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nº ${quote.quoteNumber} • ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += isNewPage ? 12 : 15;
    } else {
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('ORÇAMENTO', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Orçamento nº ${quote.quoteNumber} – ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += isNewPage ? 10 : 15;
    }

    return yPosition - startY;
  };

  // Função para adicionar rodapé com numeração
  const addFooter = () => {
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    
    // Numeração de página
    doc.text(`Página ${currentPage}`, pageWidth / 2, footerY, { align: 'center' });
    
    // Rodapé discreto para plano gratuito
    if (!isUserPremium) {
      doc.setTextColor(150, 150, 150);
      doc.text('Gerado com Fechou!', pageWidth / 2, footerY - 5, { align: 'center' });
    }
    
    doc.setTextColor(0, 0, 0);
  };

  // Adicionar cabeçalho inicial
  addHeader();

  // Seção de dados do cliente
  if (checkPageBreak(50)) {
    addNewPage();
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', marginLeft, yPosition);
  yPosition += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const clientInfo = [
    `Nome: ${quote.client.name}`,
    quote.client.email ? `Email: ${quote.client.email}` : null,
    quote.client.phone ? `Telefone: ${quote.client.phone}` : null,
  ].filter(Boolean);

  if (quote.client.address) {
    const address = `${quote.client.address}${quote.client.number ? `, ${quote.client.number}` : ''}${quote.client.complement ? `, ${quote.client.complement}` : ''}`;
    clientInfo.push(`Endereco: ${address}`);
    
    if (quote.client.city && quote.client.state) {
      clientInfo.push(`${quote.client.city} - ${quote.client.state}`);
    }
  }

  // Verificar se dados do cliente cabem na página atual
  if (checkPageBreak(clientInfo.length * 5 + 15)) {
    addNewPage();
  }

  clientInfo.forEach(info => {
    if (info) {
      doc.text(info, marginLeft, yPosition);
      yPosition += 5;
    }
  });

  yPosition += 8;

  // Título do orçamento
  if (checkPageBreak(15)) {
    addNewPage();
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Título: ${quote.title}`, marginLeft, yPosition);
  yPosition += 10;

  // Descrição
  if (quote.description) {
    const splitDescription = doc.splitTextToSize(quote.description, pageWidth - marginLeft - marginRight);
    const descriptionHeight = splitDescription.length * 5 + 16;
    
    if (checkPageBreak(descriptionHeight)) {
      addNewPage();
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Descrição:', marginLeft, yPosition);
    yPosition += 6;
    
    doc.text(splitDescription, marginLeft, yPosition);
    yPosition += splitDescription.length * 5 + 10;
  }

  // Tabela de serviços
  const tableRowHeight = 8;
  const tableHeaderHeight = 12;
  const estimatedTableHeight = (quote.items.length + 1) * tableRowHeight + tableHeaderHeight + 20;
  
  // Se a tabela não couber na página atual, quebrar antes dela
  if (checkPageBreak(estimatedTableHeight)) {
    addNewPage();
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SERVIÇOS', marginLeft, yPosition);
  yPosition += 8;

  // Configuração da tabela
  const tableStartY = yPosition;
  const tableWidth = pageWidth - marginLeft - marginRight;
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  
  // Cabeçalho da tabela
  doc.setFillColor(240, 240, 240);
  doc.rect(marginLeft, yPosition - 2, tableWidth, tableRowHeight, 'F');
  doc.rect(marginLeft, yPosition - 2, tableWidth, tableRowHeight, 'S');
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Descrição', marginLeft + 2, yPosition + 3);
  doc.text('Qtd', marginLeft + 80, yPosition + 3, { align: 'center' });
  doc.text('Valor Unit.', marginLeft + 130, yPosition + 3, { align: 'right' });
  doc.text('Total', marginLeft + 165, yPosition + 3, { align: 'right' });
  
  // Linhas verticais do cabeçalho
  doc.line(marginLeft + 70, tableStartY - 2, marginLeft + 70, yPosition + 6);
  doc.line(marginLeft + 100, tableStartY - 2, marginLeft + 100, yPosition + 6);
  doc.line(marginLeft + 140, tableStartY - 2, marginLeft + 140, yPosition + 6);
  
  yPosition += tableRowHeight;

  // Itens da tabela
  doc.setFont('helvetica', 'normal');
  quote.items.forEach((item, index) => {
    // Verificar se o item cabe na página atual
    if (checkPageBreak(tableRowHeight + 10)) {
      addNewPage();
      
      // Repetir cabeçalho da tabela na nova página
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('SERVIÇOS (continuação)', marginLeft, yPosition);
      yPosition += 8;
      
      // Cabeçalho da tabela repetido
      doc.setFillColor(240, 240, 240);
      doc.rect(marginLeft, yPosition - 2, tableWidth, tableRowHeight, 'F');
      doc.rect(marginLeft, yPosition - 2, tableWidth, tableRowHeight, 'S');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Descrição', marginLeft + 2, yPosition + 3);
      doc.text('Qtd', marginLeft + 80, yPosition + 3, { align: 'center' });
      doc.text('Valor Unit.', marginLeft + 130, yPosition + 3, { align: 'right' });
      doc.text('Total', marginLeft + 165, yPosition + 3, { align: 'right' });
      
      doc.line(marginLeft + 70, yPosition - 2, marginLeft + 70, yPosition + 6);
      doc.line(marginLeft + 100, yPosition - 2, marginLeft + 100, yPosition + 6);
      doc.line(marginLeft + 140, yPosition - 2, marginLeft + 140, yPosition + 6);
      
      yPosition += tableRowHeight;
      doc.setFont('helvetica', 'normal');
    }

    // Fundo alternado para as linhas
    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(marginLeft, yPosition - 2, tableWidth, tableRowHeight, 'F');
    }
    
    // Bordas da linha
    doc.rect(marginLeft, yPosition - 2, tableWidth, tableRowHeight, 'S');
    
    const description = doc.splitTextToSize(item.description, 65);
    doc.text(description, marginLeft + 2, yPosition + 3);
    doc.text(item.quantity.toString(), marginLeft + 80, yPosition + 3, { align: 'center' });
    
    const unitPrice = parseFloat(item.unitPrice);
    const total = parseFloat(item.total);
    doc.text(`R$ ${unitPrice.toFixed(2).replace('.', ',')}`, marginLeft + 130, yPosition + 3, { align: 'right' });
    doc.text(`R$ ${total.toFixed(2).replace('.', ',')}`, marginLeft + 165, yPosition + 3, { align: 'right' });
    
    // Linhas verticais
    doc.line(marginLeft + 70, yPosition - 2, marginLeft + 70, yPosition + 6);
    doc.line(marginLeft + 100, yPosition - 2, marginLeft + 100, yPosition + 6);
    doc.line(marginLeft + 140, yPosition - 2, marginLeft + 140, yPosition + 6);
    
    yPosition += tableRowHeight;
  });

  yPosition += 4;

  // Total geral
  if (checkPageBreak(15)) {
    addNewPage();
  }

  const total = parseFloat(quote.total);
  doc.setFillColor(220, 220, 220);
  doc.rect(marginLeft + 70, yPosition - 2, 95, 10, 'F');
  doc.rect(marginLeft + 70, yPosition - 2, 95, 10, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL GERAL:', marginLeft + 72, yPosition + 4);
  doc.text(`R$ ${total.toFixed(2).replace('.', ',')}`, marginLeft + 163, yPosition + 4, { align: 'right' });
  yPosition += 20;

  // Seção de condições - quebrar aqui se necessário
  const conditionsHeight = 60 + (quote.paymentTerms ? 20 : 0) + (quote.executionDeadline ? 15 : 0) + (quote.observations ? 30 : 0);
  
  if (checkPageBreak(conditionsHeight)) {
    addNewPage();
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDIÇÕES', marginLeft, yPosition);
  yPosition += 10;

  // Condições de pagamento
  if (quote.paymentTerms) {
    if (checkPageBreak(25)) {
      addNewPage();
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Condições de pagamento:', marginLeft, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'normal');
    const splitPayment = doc.splitTextToSize(quote.paymentTerms, pageWidth - marginLeft - marginRight);
    doc.text(splitPayment, marginLeft, yPosition);
    yPosition += splitPayment.length * 4 + 8;
  }

  // Prazo de execução
  if (quote.executionDeadline) {
    if (checkPageBreak(15)) {
      addNewPage();
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Prazo de execução:', marginLeft, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.text(quote.executionDeadline, marginLeft, yPosition);
    yPosition += 8;
  }

  // Validade do orçamento
  if (checkPageBreak(15)) {
    addNewPage();
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Validade do orçamento:', marginLeft, yPosition);
  yPosition += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Válido até ${format(new Date(quote.validUntil), 'dd/MM/yyyy', { locale: ptBR })}`, marginLeft, yPosition);
  yPosition += 15;

  // Observações
  if (quote.observations) {
    const splitObservations = doc.splitTextToSize(quote.observations, pageWidth - marginLeft - marginRight);
    const obsHeight = splitObservations.length * 4 + 14;
    
    if (checkPageBreak(obsHeight)) {
      addNewPage();
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', marginLeft, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.text(splitObservations, marginLeft, yPosition);
    yPosition += splitObservations.length * 4 + 8;
  }

  // Texto padrão e assinatura - quebrar se necessário
  const signatureHeight = 60;
  if (checkPageBreak(signatureHeight)) {
    addNewPage();
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Fico à disposição para dúvidas e aguardo sua aprovação.', marginLeft, yPosition);
  yPosition += 25;

  // Assinatura centralizada com nome e CPF
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  const userName = user.businessName || `${user.firstName} ${user.lastName}`.trim();
  
  // Verificar todas as possíveis propriedades para CPF/CNPJ
  const possibleCpfFields = ['cpfCnpj', 'cpf', 'cnpj', 'document', 'taxId', 'cpf_cnpj'];
  let userCpf = '';
  
  for (const field of possibleCpfFields) {
    const value = (user as any)[field];
    if (value && value.toString().trim() !== '') {
      userCpf = value.toString().trim();
      console.log(`CPF/CNPJ found in field '${field}':`, userCpf);
      break;
    }
  }
  
  console.log('=== DEBUG USER DATA ===');
  console.log('Complete user object:', JSON.stringify(user, null, 2));
  console.log('All user properties:', Object.keys(user));
  console.log('Final CPF/CNPJ value:', userCpf);
  console.log('========================');
  
  // Nome em negrito
  doc.text(userName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  
  // CPF/CNPJ logo abaixo do nome, em fonte normal
  if (userCpf) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`CPF/CNPJ: ${formatCPF(userCpf)}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
  } else {
    console.log('Nenhum CPF/CNPJ encontrado nos campos:', possibleCpfFields);
  }

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

  // Adicionar rodapé em todas as páginas
  totalPages = currentPage;
  for (let page = 1; page <= totalPages; page++) {
    if (page > 1) {
      doc.setPage(page);
    }
    currentPage = page;
    addFooter();
  }

  // Atualizar numeração com total de páginas
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    
    // Limpar área do rodapé e reescrever
    doc.setFillColor(255, 255, 255);
    doc.rect(0, footerY - 3, pageWidth, 15, 'F');
    
    doc.text(`Página ${page} de ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
    
    // Na última página, adicionar endereço e telefone
    if (page === totalPages) {
      // Verificar todas as possíveis propriedades para endereço
      const possibleAddressFields = ['address', 'streetAddress', 'street', 'endereco'];
      const possiblePhoneFields = ['phone', 'phoneNumber', 'telefone', 'celular', 'mobile'];
      
      let userAddress = '';
      let userPhone = '';
      
      // Procurar endereço
      for (const field of possibleAddressFields) {
        const value = (user as any)[field];
        if (value && value.toString().trim() !== '') {
          userAddress = value.toString().trim();
          console.log(`Endereço encontrado no campo '${field}':`, userAddress);
          break;
        }
      }
      
      // Procurar telefone
      for (const field of possiblePhoneFields) {
        const value = (user as any)[field];
        if (value && value.toString().trim() !== '') {
          userPhone = value.toString().trim();
          console.log(`Telefone encontrado no campo '${field}':`, userPhone);
          break;
        }
      }
      
      console.log('=== DEBUG FOOTER DATA ===');
      console.log('Address fields checked:', possibleAddressFields);
      console.log('Phone fields checked:', possiblePhoneFields);
      console.log('Final address:', userAddress);
      console.log('Final phone:', userPhone);
      console.log('========================');
      
      if (userAddress || userPhone) {
        const addressParts = [];
        
        if (userAddress) {
          const addressComponents = [
            userAddress,
            (user as any).number || (user as any).addressNumber ? `nº ${(user as any).number || (user as any).addressNumber}` : null,
            (user as any).complement || (user as any).addressComplement,
            (user as any).city || (user as any).cidade,
            (user as any).state || (user as any).uf || (user as any).estado,
            (user as any).zipCode || (user as any).cep ? `CEP: ${formatCEP((user as any).zipCode || (user as any).cep)}` : null,
          ].filter(Boolean).join(', ');
          addressParts.push(addressComponents);
        }
        
        if (userPhone) {
          addressParts.push(`Tel: ${formatPhone(userPhone)}`);
        }
        
        const footerText = addressParts.join(' - ');
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        doc.text(footerText, pageWidth / 2, footerY + 5, { align: 'center' });
        
        console.log('Footer final text:', footerText);
      } else {
        console.log('Nenhum endereço ou telefone encontrado para o rodapé');
        console.log('Campos de endereço verificados:', possibleAddressFields);
        console.log('Campos de telefone verificados:', possiblePhoneFields);
      }
    }
    
    if (!isUserPremium) {
      doc.setTextColor(150, 150, 150);
      doc.text('Gerado com Fechou!', pageWidth / 2, footerY - 5, { align: 'center' });
    }
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
