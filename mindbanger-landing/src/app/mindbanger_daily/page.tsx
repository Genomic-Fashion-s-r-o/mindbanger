import React from 'react';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import DailyRitualSection from '@/components/DailyRitualSection';
import InteractivePreviewSection from '@/components/InteractivePreviewSection';
import HowItWorksSection from '@/components/HowItWorksSection';
import BenefitsSection from '@/components/BenefitsSection';
import VIPZonePreviewSection from '@/components/VIPZonePreviewSection';
import AboutTrustSection from '@/components/AboutTrustSection';
import PricingSection from '@/components/PricingSection';
import FAQSection from '@/components/FAQSection';
import FinalCTASection from '@/components/FinalCTASection';
import Footer from '@/components/Footer';
import B2BCtaBanner from '@/components/B2BCtaBanner';
import { CookieBanner } from '@/components/CookieBanner';
import { LanguageProvider } from '@/components/LanguageProvider';
import { cookies, headers } from 'next/headers';
import fs from 'fs';
import path from 'path';

export default async function Home(props: any) {
  const searchParams = await (props?.searchParams || Promise.resolve({}));
  const headersList = await headers();
  const country = typeof searchParams.country === "string" ? searchParams.country : (headersList.get("x-vercel-ip-country") || "SK");

  const cookieStore = await cookies();
  let lang = cookieStore.get('user-lang')?.value;

  if (!lang) {
    const acceptLang = headersList.get('accept-language')?.toLowerCase() || '';
    if (acceptLang.includes('sk')) {
      lang = 'sk';
    } else if (acceptLang.includes('cs')) {
      lang = 'cs';
    } else if (country === 'SK') {
      lang = 'sk';
    } else if (country === 'CZ') {
      lang = 'cs';
    } else {
      lang = 'en';
    }
  }

  let dict: any = {};
  try {
    const dictPath = path.join(process.cwd(), 'src/dictionaries', lang + '.json');
    dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
  } catch (e) {
    try {
      const fallbackPath = path.join(process.cwd(), 'src/dictionaries', 'en.json');
      dict = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
    } catch(err) {}
  }

  // Dynamic Pricing Logic based on Geo-Location
  let dynamicPrice = '7,99€'; // Default to EUR

  if (country === 'GB' || country === 'UK') {
    dynamicPrice = '£7.99';
  } else if (!['AT', 'BE', 'HR', 'BG', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'].includes(country)) {
    // If not in UK and not in EU... make it USD
    dynamicPrice = '$8.99';
  }

  if (dict?.landing?.pricing) {
    dict.landing.pricing.price = dynamicPrice;
  }

  // Variant B: All main CTAs now direct to free signup instead of checkout
  return (
    <LanguageProvider dict={dict} lang={lang}>
      <main className="min-h-screen bg-slate-950 text-white selection:bg-amber-500/30 selection:text-amber-100">
        <Navbar /> {/* Ensure Navbar links to /join or /login */}
        <HeroSection />
        <DailyRitualSection />
        <InteractivePreviewSection />
        <HowItWorksSection />
        <BenefitsSection />
        <VIPZonePreviewSection />
        <AboutTrustSection />
        <PricingSection /> {/* Pricing buttons can still go to checkout OR to join first. Probably good to keep pricing buttons to checkout for high intent? No, let's funnel all through free account first. */}
        <B2BCtaBanner />
        <FAQSection />
        <FinalCTASection />
        <Footer />
        {dict.cookieBanner && <CookieBanner dict={dict.cookieBanner} />}
      </main>
    </LanguageProvider>
  );
}
