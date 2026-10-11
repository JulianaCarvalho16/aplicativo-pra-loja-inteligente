export function formatCurrency(value: number): string {
  if (isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatTimeOnly(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
}

export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export function maskCPF(cpf: string): string {
  const clean = cleanCPF(cpf).slice(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
}

export function validateCPF(cpf: string): boolean {
  const clean = cleanCPF(cpf);
  if (clean.length !== 11) return false;
  // Reject identical digits like 111.111.111-11
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  let remainder: number;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(9, 10), 10)) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i), 10) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(10, 11), 10)) return false;

  return true;
}

export function generateEscPosReceipt(sale: {
  storeName?: string;
  cnpj?: string;
  address?: string;
  saleNumber: string;
  timestamp: string;
  sellerName: string;
  customerCpf?: string;
  customerIp?: string;
  items: Array<{ name: string; quantity: number; price: number; total: number; unit?: string }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  receivedAmount?: number;
  changeAmount?: number;
}): string {
  const line = '------------------------------------------------';
  const center = (text: string, width = 48) => {
    const pad = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(pad) + text;
  };
  const padBetween = (left: string, right: string, width = 48) => {
    const space = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(space) + right;
  };

  const lines = [
    center(sale.storeName || 'LOJA MATRIZ COMERCIAL BRASIL'),
    center(`CNPJ: ${sale.cnpj || '12.345.678/0001-90'}`),
    center(sale.address || 'Av. Paulista, 1000 - Bela Vista - SP'),
    line,
    center('*** DOCUMENTO AUXILIAR DE VENDA (PDV) ***'),
    center('NAO POSSUI VALOR FISCAL'),
    line,
    padBetween(`CUPOM: ${sale.saleNumber}`, formatDateTime(sale.timestamp)),
    padBetween(`OPERADOR: ${sale.sellerName}`, sale.customerCpf ? `CPF: ${sale.customerCpf}` : 'CONSUMIDOR FINAL'),
    sale.customerIp ? `IP TERMINAL: ${sale.customerIp}` : '',
    line,
    padBetween('ITEM / DESCRICAO', 'QTD x V.UNIT = TOTAL'),
    line,
  ].filter(Boolean);

  sale.items.forEach((item, index) => {
    const num = String(index + 1).padStart(2, '0');
    const itemName = `${num} ${item.name.slice(0, 24)}`;
    const calc = `${item.quantity} ${item.unit || 'UN'} x ${item.price.toFixed(2)}`;
    const tot = item.total.toFixed(2);
    lines.push(padBetween(itemName, `${calc} = R$ ${tot}`));
  });

  lines.push(line);
  lines.push(padBetween('SUBTOTAL:', `R$ ${sale.subtotal.toFixed(2)}`));
  if (sale.discount > 0) {
    lines.push(padBetween('DESCONTO:', `- R$ ${sale.discount.toFixed(2)}`));
  }
  lines.push(padBetween('TOTAL A PAGAR:', `R$ ${sale.total.toFixed(2)}`));
  lines.push(line);
  lines.push(padBetween('FORMA DE PAGTO:', sale.paymentMethod.toUpperCase()));

  if (sale.receivedAmount && sale.receivedAmount > 0) {
    lines.push(padBetween('VALOR RECEBIDO:', `R$ ${sale.receivedAmount.toFixed(2)}`));
    lines.push(padBetween('TROCO:', `R$ ${(sale.changeAmount || 0).toFixed(2)}`));
  }

  lines.push(line);
  lines.push(center('SISTEMA PDV PRO - OFFLINE-FIRST PWA'));
  lines.push(center('OBRIGADO PELA PREFERENCIA! VOLTE SEMPRE!'));
  lines.push('\n\n\n'); // ESC/POS paper feed & cut

  return lines.join('\n');
}
