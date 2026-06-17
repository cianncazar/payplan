'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedSection } from './animated-section';

const FAQS = [
  {
    question: 'Do I need an account?',
    answer:
      'No. PayPlan works without sign-up. You can start planning immediately.',
  },
  {
    question: 'Where is my data stored?',
    answer:
      'Your plan is stored in your current browser by default. You can export a backup file if you want to keep a copy.',
  },
  {
    question: 'Does PayPlan connect to my bank?',
    answer:
      'No. PayPlan does not connect to banks or e-wallets. You manually enter the cash, income, and payments you want to plan.',
  },
  {
    question: 'Does PayPlan pay my bills?',
    answer:
      'No. PayPlan helps you plan payments. It does not process payments or send money.',
  },
  {
    question: 'Is this financial advice?',
    answer:
      'No. PayPlan provides planning estimates based on the information you enter. Always confirm balances, fees, interest, and due dates with the lender, biller, or payee.',
  },
  {
    question: 'Can I move my plan to another device?',
    answer:
      'Yes, by exporting a backup file and importing it on another device. If optional Google Drive backup is implemented, you may also use that.',
  },
] as const;

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-muted/40 py-16 md:py-24" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <h2 id="faq-heading" className="text-3xl font-bold tracking-tight md:text-4xl">
            Common questions
          </h2>
        </AnimatedSection>

        <div className="mx-auto mt-10 max-w-3xl space-y-3">
          {FAQS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <AnimatedSection key={item.question} delay={index * 60}>
                <div className="rounded-xl border border-border bg-card shadow-sm transition-shadow duration-200 hover:shadow-md">
                  <button
                    type="button"
                    id={`faq-btn-${index}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${index}`}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 rounded-xl px-5 py-4 text-left transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="font-medium">{item.question}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300',
                        isOpen && 'rotate-180'
                      )}
                      aria-hidden
                    />
                  </button>
                  <div
                    id={`faq-panel-${index}`}
                    role="region"
                    aria-labelledby={`faq-btn-${index}`}
                    className={cn('px-5 pb-4 text-sm text-muted-foreground', !isOpen && 'hidden')}
                  >
                    {item.answer}
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
