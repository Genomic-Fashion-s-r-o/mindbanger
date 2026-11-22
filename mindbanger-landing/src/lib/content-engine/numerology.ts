/**
 * Numerology Utilities for Mindbanger Content Engine
 * Calculates Universal Day Number and other date-based vibrations.
 */

// Helper to reduce number to single digit (1-9) or master numbers (11, 22, 33)
// For daily energy, we usually reduce to 1-9.
export function reduceToSingleDigit(num: number): number {
  if (num === 0) return 0;
  // Keep reducing until single digit
  // Note in numerology sometimes 11, 22 are kept but for simplicity 1-9 is standard for daily general vibe
  let sum = num;
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = String(sum)
      .split('')
      .reduce((acc, curr) => acc + parseInt(curr), 0);
  }
  return sum;
}

export function getUniversalDayNumber(date: Date): number {
  const day = date.getDate();
  const month = date.getMonth() + 1; // 0-indexed
  const year = date.getFullYear();

  // Universal Day = Day + Month + Year
  // Summing digits: 
  // e.g. 2023-10-25 -> 2+0+2+3 + 1+0 + 2+5 = 15 -> 6
  
  const daySum = reduceToSingleDigit(day);
  const monthSum = reduceToSingleDigit(month);
  const yearSum = reduceToSingleDigit(year);
  
  const total = daySum + monthSum + yearSum;
  return reduceToSingleDigit(total);
}

// Simple lookup for Zodiac sign based on Day/Month
export function getZodiacSign(date: Date): string {
    const day = date.getDate();
    const month = date.getMonth() + 1;

    if ((month == 1 && day <= 19) || (month == 12 && day >= 22)) return "Capricorn";
    if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return "Aquarius";
    if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return "Pisces";
    if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return "Aries";
    if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return "Taurus";
    if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return "Gemini";
    if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return "Cancer";
    if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return "Leo";
    if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return "Virgo";
    if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return "Libra";
    if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return "Scorpio";
    if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) return "Sagittarius";
    
    return "Unknown";
}
