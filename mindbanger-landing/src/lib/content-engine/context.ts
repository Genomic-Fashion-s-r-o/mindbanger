import { getUniversalDayNumber, getZodiacSign } from './numerology';
import { getDailyEnergy, DailyEnergy } from './energy';

export interface DailyContext {
  date: string;
  dayOfWeek: string;
  universalDayNumber: number;
  zodiacSign: string;
  planetaryEnergy: DailyEnergy;
  moonPhase: string;
  season: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getMoonPhase(date: Date): string {
  // Approximate Moon Phase
  const knownNewMoon = new Date('2024-01-11T11:57:00Z'); // Reference New Moon
  const cycleLength = 29.53059;
  const diffTime = date.getTime() - knownNewMoon.getTime();
  const daysSince = diffTime / (1000 * 60 * 60 * 24);
  const cycleDay = (daysSince % cycleLength + cycleLength) % cycleLength; // Handle negative dates
  
  if (cycleDay < 1.84) return "New Moon (New Beginnings)";
  if (cycleDay < 7.38) return "Waxing Crescent (Setting Intentions)";
  if (cycleDay < 11.07) return "First Quarter (Action)";
  if (cycleDay < 14.76) return "Waxing Gibbous (Refinement)";
  if (cycleDay < 16.61) return "Full Moon (Peak/Release)";
  if (cycleDay < 22.15) return "Waning Gibbous (Gratitude)";
  if (cycleDay < 25.84) return "Last Quarter (Release)";
  return "Waning Crescent (Rest)";
}

function getSeason(date: Date): string {
  const month = date.getMonth(); // 0-11
  // Simple Northern Hemisphere seasons
  if (month >= 2 && month <= 4) return "Spring (Wood - Growth)";
  if (month >= 5 && month <= 7) return "Summer (Fire - Expansion)";
  if (month >= 8 && month <= 10) return "Autumn (Metal - Harvest)";
  return "Winter (Water - Reflection)";
}

export function buildDailyContext(dateStr: string): DailyContext {
  const date = new Date(dateStr);
  
  // Day of week (0-6)
  const dayIndex = date.getDay();
  const dayName = DAYS[dayIndex];
  
  // Numerology
  const universalDayNumber = getUniversalDayNumber(date);
  
  // Zodiac
  const zodiacSign = getZodiacSign(date);
  
  // Energy
  const planetaryEnergy = getDailyEnergy(dayIndex);

  // Natural Cycles
  const moonPhase = getMoonPhase(date);
  const season = getSeason(date);
  
  return {
    date: dateStr,
    dayOfWeek: dayName,
    universalDayNumber,
    zodiacSign,
    planetaryEnergy,
    moonPhase,
    season
  };
}

export function formatContextForPrompt(context: DailyContext): string {
  return `
--- DAILY CONTEXT ---
Date: ${context.date} (${context.dayOfWeek})
Universal Day Number: ${context.universalDayNumber}
Zodiac Sign: ${context.zodiacSign}
Moon Phase: ${context.moonPhase}
Season: ${context.season}
Planetary Energy: ${context.planetaryEnergy.planet} (${context.planetaryEnergy.theme})
Focus Areas: ${context.planetaryEnergy.focus}
Chakra: ${context.planetaryEnergy.chakra}
Element: ${context.planetaryEnergy.element}
---------------------
Use these influences to guide the tone and topic selection, but keep the core "Mindbanger" style (stoic, direct, masculine).
`;
}
