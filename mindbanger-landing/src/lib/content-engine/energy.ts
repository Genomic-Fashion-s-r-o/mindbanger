export interface DailyEnergy {
  planet: string;
  theme: string;
  focus: string;
  chakra: string;
  element: string;
}

// Map day of week (0-6) to planet/energy
const DAILY_ENERGY_MAP: Record<number, DailyEnergy> = {
  // Sunday
  0: {
    planet: 'Sun',
    theme: 'Radiance, Vitality, Leadership',
    focus: 'Self-expression, confidence, personal power',
    chakra: 'Solar Plexus',
    element: 'Fire'
  },
  // Monday
  1: {
    planet: 'Moon',
    theme: 'Intuition, Emotion, Cycles',
    focus: 'Inner world, feelings, nurturing, subconscious',
    chakra: 'Sacral',
    element: 'Water'
  },
  // Tuesday
  2: {
    planet: 'Mars',
    theme: 'Action, drive, passion',
    focus: 'Initiative, courage, physical energy, assertiveness',
    chakra: 'Root',
    element: 'Fire'
  },
  // Wednesday
  3: {
    planet: 'Mercury',
    theme: 'Communication, intellect, adaptability',
    focus: 'Networking, learning, clarity, mental agility',
    chakra: 'Throat',
    element: 'Air'
  },
  // Thursday
  4: {
    planet: 'Jupiter',
    theme: 'Expansion, abundance, wisdom',
    focus: 'Growth, optimism, higher learning, philosophy',
    chakra: 'Crown', 
    element: 'Ether/Space' // Often associated with expansion
  },
  // Friday
  5: {
    planet: 'Venus',
    theme: 'Love, harmony, beauty, value',
    focus: 'Relationships, aesthetics, financial flow, pleasure',
    chakra: 'Heart',
    element: 'Air/Earth'
  },
  // Saturday
  6: {
    planet: 'Saturn',
    theme: 'Structure, discipline, mastery',
    focus: 'Boundaries, responsibility, long-term planning, grounding',
    chakra: 'Root',
    element: 'Earth'
  }
};

export function getDailyEnergy(dayIndex: number): DailyEnergy {
  // Ensure 0-6 range just in case
  const idx = dayIndex % 7;
  return DAILY_ENERGY_MAP[idx] || DAILY_ENERGY_MAP[0];
}

// Additional esoteric helpers can go here (e.g., specific moon phase logic if we add it later)
