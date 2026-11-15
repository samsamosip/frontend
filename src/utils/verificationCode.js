export function toCodeDigits(value = '') {
  const text = String(value).replace(/\D/g, '');
  return Array.from({ length: 6 }, (_, index) => text[index] ?? '');
}

export function isCompleteCode(digits) {
  return digits.length === 6 && digits.every((digit) => /^\d$/.test(digit));
}
