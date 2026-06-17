import type { Metadata } from 'next';
import { LandingHeader } from '@/components/landing/landing-header';
import { LandingHero } from '@/components/landing/landing-hero';
import { ProblemSection } from '@/components/landing/problem-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { BenefitsSection } from '@/components/landing/benefits-section';
import { ShortfallExampleSection } from '@/components/landing/shortfall-example-section';
import { PrivacySection } from '@/components/landing/privacy-section';
import { UseCasesSection } from '@/components/landing/use-cases-section';
import { ProductPreviewSection } from '@/components/landing/product-preview-section';
import { FAQSection } from '@/components/landing/faq-section';
import { LandingCTA } from '@/components/landing/landing-cta';
import { LandingFooter } from '@/components/landing/landing-footer';

export const metadata: Metadata = {
  title: "PayPlan — Know if you'll have enough money before payday",
  description:
    'PayPlan is a local-first payment planner that helps you forecast cash flow, upcoming payment deadlines, and shortfalls before payday. No account required.',
  keywords: [
    'payment planner',
    'cash flow planner',
    'payday planning',
    'bill planner',
    'shortfall tracker',
    'local-first finance app',
  ],
  openGraph: {
    title: "PayPlan — Know if you'll have enough money before payday",
    description:
      'Plan upcoming payments, expected income, and shortfalls without creating an account.',
    type: 'website',
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main id="main-content">
        <LandingHero />
        <ProblemSection />
        <HowItWorksSection />
        <BenefitsSection />
        <ShortfallExampleSection />
        <PrivacySection />
        <UseCasesSection />
        <ProductPreviewSection />
        <FAQSection />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
