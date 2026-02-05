export function normalizePhone(input: string): string {
  return input.trim();
}

export function isValidPhone(phone: string): boolean {
  return /^\+380\d{9}$/.test(phone);
}

export function isValidCode(code: string): boolean {
  return /^\d{4}$/.test(code);
}
