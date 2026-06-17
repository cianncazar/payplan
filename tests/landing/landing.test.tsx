import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock next/link as a plain anchor element.
vi.mock('next/link', () => ({
  default: function MockLink({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
}));

// Mock next/navigation used by LandingHeader (no router needed for these tests).
vi.mock('next/navigation', () => ({
  usePathname: () => '/landing',
  useRouter: () => ({ push: vi.fn() }),
}));

import { LandingHero } from '@/components/landing/landing-hero';
import { LandingHeader } from '@/components/landing/landing-header';
import { ProblemSection } from '@/components/landing/problem-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { BenefitsSection } from '@/components/landing/benefits-section';
import { ShortfallExampleSection } from '@/components/landing/shortfall-example-section';
import { PrivacySection } from '@/components/landing/privacy-section';
import { UseCasesSection } from '@/components/landing/use-cases-section';
import { FAQSection } from '@/components/landing/faq-section';
import { LandingCTA } from '@/components/landing/landing-cta';
import { LandingFooter } from '@/components/landing/landing-footer';

describe('LandingHero', () => {
  it('displays the core promise headline', () => {
    render(<LandingHero />);
    expect(
      screen.getByRole('heading', { name: /know if you.ll have enough money before payday/i })
    ).toBeInTheDocument();
  });

  it('has a primary CTA linking to the app', () => {
    render(<LandingHero />);
    const cta = screen.getAllByRole('link', { name: /start planning/i })[0];
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/');
  });

  it('has a secondary CTA scrolling to how-it-works', () => {
    render(<LandingHero />);
    const secondary = screen.getByRole('link', { name: /see how it works/i });
    expect(secondary).toHaveAttribute('href', '#how-it-works');
  });

  it('shows the local-first trust note', () => {
    render(<LandingHero />);
    expect(screen.getByText(/your plan stays in this browser/i)).toBeInTheDocument();
  });

  it('does not include any login or sign-up UI', () => {
    render(<LandingHero />);
    expect(screen.queryByText(/sign.?up|log.?in|create account/i)).toBeNull();
  });
});

describe('LandingHeader', () => {
  it('renders the PayPlan brand name', () => {
    render(<LandingHeader />);
    expect(screen.getByRole('link', { name: /payplan/i })).toBeInTheDocument();
  });

  it('renders the Start Planning CTA in desktop nav', () => {
    render(<LandingHeader />);
    const links = screen.getAllByRole('link', { name: /start planning/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0]).toHaveAttribute('href', '/');
  });

  it('toggles mobile menu on button click', () => {
    render(<LandingHeader />);
    const toggleBtn = screen.getByRole('button', { name: /open menu/i });
    expect(screen.queryByRole('navigation', { name: /mobile navigation/i })).toBeNull();
    fireEvent.click(toggleBtn);
    expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeInTheDocument();
  });
});

describe('ProblemSection', () => {
  it('shows the section headline', () => {
    render(<ProblemSection />);
    expect(
      screen.getByRole('heading', { name: /bills are easy to list/i })
    ).toBeInTheDocument();
  });

  it('shows all three problem cards', () => {
    render(<ProblemSection />);
    expect(screen.getByText(/payments come before payday/i)).toBeInTheDocument();
    expect(screen.getByText(/daily needs reduce available cash/i)).toBeInTheDocument();
    expect(screen.getByText(/small gaps become missed deadlines/i)).toBeInTheDocument();
  });
});

describe('HowItWorksSection', () => {
  it('shows the three-steps headline', () => {
    render(<HowItWorksSection />);
    expect(
      screen.getByRole('heading', { name: /plan your payments in three steps/i })
    ).toBeInTheDocument();
  });

  it('renders all three steps', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText(/add your available cash/i)).toBeInTheDocument();
    expect(screen.getByText(/add income and deadlines/i)).toBeInTheDocument();
    expect(screen.getByText(/see what is covered/i)).toBeInTheDocument();
  });

  it('has a CTA linking to the app', () => {
    render(<HowItWorksSection />);
    const cta = screen.getByRole('link', { name: /create my first plan/i });
    expect(cta).toHaveAttribute('href', '/');
  });
});

describe('BenefitsSection', () => {
  it('shows the section headline', () => {
    render(<BenefitsSection />);
    expect(
      screen.getByRole('heading', { name: /built for payment planning/i })
    ).toBeInTheDocument();
  });

  it('renders all six benefit titles', () => {
    render(<BenefitsSection />);
    expect(screen.getByText(/see upcoming payment risk/i)).toBeInTheDocument();
    expect(screen.getByText(/forecast cash before payday/i)).toBeInTheDocument();
    expect(screen.getByText(/reserve daily allowance/i)).toBeInTheDocument();
    expect(screen.getByText(/spot shortfalls early/i)).toBeInTheDocument();
    expect(screen.getByText(/compare scenarios/i)).toBeInTheDocument();
    expect(screen.getByText(/works without an account/i)).toBeInTheDocument();
  });
});

describe('ShortfallExampleSection', () => {
  it('shows the shortfall headline', () => {
    render(<ShortfallExampleSection />);
    expect(
      screen.getByRole('heading', { name: /shortfalls are shown before they become missed payments/i })
    ).toBeInTheDocument();
  });

  it('shows the example alert content', () => {
    render(<ShortfallExampleSection />);
    expect(screen.getByText(/shortfall detected/i)).toBeInTheDocument();
    expect(screen.getByText(/₱1,250 short on june 25/i)).toBeInTheDocument();
  });
});

describe('PrivacySection', () => {
  it('shows the privacy headline', () => {
    render(<PrivacySection />);
    expect(
      screen.getByRole('heading', { name: /no account required/i })
    ).toBeInTheDocument();
  });

  it('shows the local storage warning', () => {
    render(<PrivacySection />);
    expect(screen.getByText(/clearing browser data.*may remove your plan/i)).toBeInTheDocument();
  });

  it('mentions no sign-up required', () => {
    render(<PrivacySection />);
    expect(screen.getByText(/no sign-up required/i)).toBeInTheDocument();
  });
});

describe('UseCasesSection', () => {
  it('shows the section headline', () => {
    render(<UseCasesSection />);
    expect(screen.getByRole('heading', { name: /useful when timing matters/i })).toBeInTheDocument();
  });

  it('shows all four use cases', () => {
    render(<UseCasesSection />);
    expect(screen.getByText(/salary before bills/i)).toBeInTheDocument();
    expect(screen.getByText(/installment planning/i)).toBeInTheDocument();
    expect(screen.getByText(/daily allowance planning/i)).toBeInTheDocument();
    expect(screen.getByText(/irregular income/i)).toBeInTheDocument();
  });
});

describe('FAQSection', () => {
  it('renders all six FAQ questions', () => {
    render(<FAQSection />);
    expect(screen.getByText(/do i need an account/i)).toBeInTheDocument();
    expect(screen.getByText(/where is my data stored/i)).toBeInTheDocument();
    expect(screen.getByText(/does payplan connect to my bank/i)).toBeInTheDocument();
    expect(screen.getByText(/does payplan pay my bills/i)).toBeInTheDocument();
    expect(screen.getByText(/is this financial advice/i)).toBeInTheDocument();
    expect(screen.getByText(/can i move my plan to another device/i)).toBeInTheDocument();
  });

  it('expands an answer on click', () => {
    render(<FAQSection />);
    const btn = screen.getByRole('button', { name: /do i need an account/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    // Answer panel itself carries the 'hidden' class when collapsed
    const panel = screen.getByText(/payplan works without sign-up/i);
    expect(panel).toHaveClass('hidden');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(panel).not.toHaveClass('hidden');
  });

  it('collapses the answer when the same button is clicked again', () => {
    render(<FAQSection />);
    const btn = screen.getByRole('button', { name: /do i need an account/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('no authentication form elements are shown', () => {
    render(<FAQSection />);
    expect(screen.queryByRole('button', { name: /sign.?up|log.?in/i })).toBeNull();
    expect(screen.queryByLabelText(/password/i)).toBeNull();
  });
});

describe('LandingCTA', () => {
  it('shows the final CTA headline', () => {
    render(<LandingCTA />);
    expect(
      screen.getByRole('heading', { name: /start with your next payday/i })
    ).toBeInTheDocument();
  });

  it('has a Start Planning link to the app', () => {
    render(<LandingCTA />);
    const cta = screen.getByRole('link', { name: /start planning/i });
    expect(cta).toHaveAttribute('href', '/');
  });

  it('shows the no account note', () => {
    render(<LandingCTA />);
    expect(screen.getByText(/no account required/i)).toBeInTheDocument();
  });
});

describe('LandingFooter', () => {
  it('shows the brand name', () => {
    render(<LandingFooter />);
    expect(screen.getByText('PayPlan')).toBeInTheDocument();
  });

  it('includes the disclaimer', () => {
    render(<LandingFooter />);
    expect(screen.getByText(/payplan does not provide financial.*advice/i)).toBeInTheDocument();
  });

  it('has a Privacy link', () => {
    render(<LandingFooter />);
    expect(screen.getByRole('link', { name: /privacy/i })).toHaveAttribute('href', '/privacy');
  });
});
