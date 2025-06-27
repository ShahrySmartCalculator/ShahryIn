export function toArabicIndicNumber(input: number | string): string {
    const arabicIndicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    return String(input).replace(/\d/g, (digit) => arabicIndicDigits[parseInt(digit)]);
  }
  