/**
 * Utilitários para validação, higienização e mascaramento de CPF
 * Em conformidade estrita com as regras da Receita Federal e LGPD
 */

export function cleanCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export function isValidCpf(cpf: string): boolean {
  const cleaned = cleanCpf(cpf);

  if (cleaned.length !== 11) {
    return false;
  }

  // Bloqueia CPFs com dígitos repetidos conhecidos (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return false;
  }

  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i), 10) * (10 - i);
  }
  let rest = sum % 11;
  const digit1 = rest < 2 ? 0 : 11 - rest;
  if (digit1 !== parseInt(cleaned.charAt(9), 10)) {
    return false;
  }

  // Segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i), 10) * (11 - i);
  }
  rest = sum % 11;
  const digit2 = rest < 2 ? 0 : 11 - rest;
  if (digit2 !== parseInt(cleaned.charAt(10), 10)) {
    return false;
  }

  return true;
}

export function maskCpf(cpf: string): string {
  const cleaned = cleanCpf(cpf);
  if (cleaned.length !== 11) {
    return '***.***.***-**';
  }
  // Exibe formato seguro: ***.123.456-**
  return `***.${cleaned.substring(3, 6)}.${cleaned.substring(6, 9)}-**`;
}

export function formatCpf(cpf: string): string {
  const cleaned = cleanCpf(cpf);
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
