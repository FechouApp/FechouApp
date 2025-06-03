import jsPDF from 'jspdf';

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Client {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  cpfCnpj?: string;
}

interface User {
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  address?: string;
  cpfCnpj?: string;
}

interface Quote {
  quoteNumber: string;
  client: Client;
  items: QuoteItem[];
  discount?: string;
  notes?: string;
  createdAt: string;
  validUntil?: string;
}

export function generateQuotePDF(quote: Quote, user: User) {
  const doc = new jsPDF();

  // Configurações
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPosition = 30;

  // Header com logo (se existir)
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Número: ${quote.quoteNumber}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 20;

  // Informações do prestador de serviço
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PRESTADOR DE SERVIÇO:', margin, yPosition);

  yPosition += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const userName = user.firstName && user.lastName ? 
    `${user.firstName} ${user.lastName}` : 
    user.firstName || user.email.split('@')[0];

  doc.text(`Nome: ${userName}`, margin, yPosition);
  yPosition += 6;

  if (user.cpfCnpj) {
    doc.text(`CPF/CNPJ: ${user.cpfCnpj}`, margin, yPosition);
    yPosition += 6;
  }

  doc.text(`E-mail: ${user.email}`, margin, yPosition);
  yPosition += 6;

  if (user.phone) {
    doc.text(`Telefone: ${user.phone}`, margin, yPosition);
    yPosition += 6;
  }

  if (user.address) {
    doc.text(`Endereço: ${user.address}`, margin, yPosition);
    yPosition += 6;
  }

  yPosition += 10;

  // Informações do cliente
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE:', margin, yPosition);

  yPosition += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${quote.client.name}`, margin, yPosition);
  yPosition += 6;
  doc.text(`E-mail: ${quote.client.email}`, margin, yPosition);

  if (quote.client.phone) {
    yPosition += 6;
    doc.text(`Telefone: ${quote.client.phone}`, margin, yPosition);
  }

  if (quote.client.address) {
    yPosition += 6;
    doc.text(`Endereço: ${quote.client.address}`, margin, yPosition);
  }

  yPosition += 20;

  // Tabela de itens
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ITENS DO ORÇAMENTO:', margin, yPosition);

  yPosition += 15;

  // Cabeçalho da tabela
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIÇÃO', margin, yPosition);
  doc.text('QTD', 120, yPosition);
  doc.text('VALOR UNIT.', 140, yPosition);
  doc.text('TOTAL', 170, yPosition);

  yPosition += 5;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Itens
  doc.setFont('helvetica', 'normal');
  let total = 0;

  quote.items.forEach((item) => {
    const itemTotal = item.quantity * item.unitPrice;
    total += itemTotal;

    // Quebra de linha para descrições longas
    const description = item.description;
    const maxWidth = 90;
    const lines = doc.splitTextToSize(description, maxWidth);

    doc.text(lines, margin, yPosition);
    doc.text(item.quantity.toString(), 120, yPosition);
    doc.text(`R$ ${item.unitPrice.toFixed(2)}`, 140, yPosition);
    doc.text(`R$ ${itemTotal.toFixed(2)}`, 170, yPosition);

    yPosition += Math.max(lines.length * 5, 8);
  });

  yPosition += 10;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Subtotal e desconto
  doc.setFont('helvetica', 'bold');
  const subtotal = total;
  doc.text(`Subtotal: R$ ${subtotal.toFixed(2)}`, 120, yPosition);

  if (quote.discount && parseFloat(quote.discount) > 0) {
    yPosition += 8;
    const discountValue = (subtotal * parseFloat(quote.discount)) / 100;
    doc.text(`Desconto (${quote.discount}%): -R$ ${discountValue.toFixed(2)}`, 120, yPosition);
    total = subtotal - discountValue;
  }

  yPosition += 10;
  doc.setFontSize(12);
  doc.text(`TOTAL GERAL: R$ ${total.toFixed(2)}`, 120, yPosition);

  // Observações
  if (quote.notes) {
    yPosition += 20;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES:', margin, yPosition);

    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(quote.notes, pageWidth - 2 * margin);
    doc.text(notesLines, margin, yPosition);
    yPosition += notesLines.length * 5;
  }

  // Data e validade
  yPosition += 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const createdDate = new Date(quote.createdAt).toLocaleDateString('pt-BR');
  doc.text(`Data de emissão: ${createdDate}`, margin, yPosition);

  if (quote.validUntil) {
    yPosition += 6;
    const validDate = new Date(quote.validUntil).toLocaleDateString('pt-BR');
    doc.text(`Válido até: ${validDate}`, margin, yPosition);
  }

  // Salvar o PDF
  doc.save(`Orçamento_${quote.quoteNumber}.pdf`);
}