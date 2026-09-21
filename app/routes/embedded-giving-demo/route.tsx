import type { MetaFunction } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';

import { PushpayEmbed } from '~/components/pushpay-embed';
import { applyPushpaySiteStyles } from './pushpay-site-styles';

export const meta: MetaFunction = () => [
  { title: 'Pushpay embed demo | Christ Fellowship' },
  { name: 'robots', content: 'noindex, nofollow' },
];

const controlClassName =
  'rounded-md border px-4 py-2 text-sm font-semibold no-underline transition-colors';

export default function EmbeddedGivingDemo() {
  const [searchParams] = useSearchParams();
  const stock = searchParams.get('stock') === '1';

  useEffect(() => {
    if (stock) return;
    return applyPushpaySiteStyles();
  }, [stock]);

  return (
    <div className='min-h-screen bg-soft-white text-text-primary'>
      <section className='bg-dark-navy text-white'>
        <div className='mx-auto max-w-screen-content px-4 py-16 md:px-8 md:py-24'>
          <p className='mb-4 text-sm font-bold uppercase tracking-[0.12em] text-ocean-web'>
            Engineering demo
          </p>
          <h1 className='heading-h2 max-w-4xl'>
            Pushpay embed, styled for Christ Fellowship
          </h1>
          <p className='mt-6 max-w-3xl text-lg leading-7 text-white/80'>
            Proof that Pushpay renders an open Shadow DOM—not an iframe—and can
            inherit our typefaces and receive scoped styles without replacing
            its form behavior.
          </p>
        </div>
      </section>

      <main className='mx-auto grid max-w-screen-content gap-10 px-4 py-12 md:px-8 lg:grid-cols-[minmax(0,730px)_minmax(280px,1fr)] lg:py-16'>
        <section aria-labelledby='demo-heading'>
          <div className='mb-6 flex flex-wrap items-end justify-between gap-4'>
            <div>
              <h2 id='demo-heading' className='heading-h4'>
                Live giving form
              </h2>
              <p className='mt-2 text-text-secondary'>
                Compare site styling against Pushpay defaults.
              </p>
            </div>

            <nav aria-label='Widget styling' className='flex gap-2'>
              <a
                href='?'
                aria-current={!stock ? 'page' : undefined}
                className={`${controlClassName} ${
                  !stock
                    ? 'border-ocean bg-ocean text-white'
                    : 'border-ocean bg-transparent text-ocean hover:bg-ocean hover:text-white'
                }`}
              >
                Site styled
              </a>
              <a
                href='?stock=1'
                aria-current={stock ? 'page' : undefined}
                className={`${controlClassName} ${
                  stock
                    ? 'border-ocean bg-ocean text-white'
                    : 'border-ocean bg-transparent text-ocean hover:bg-ocean hover:text-white'
                }`}
              >
                Pushpay default
              </a>
            </nav>
          </div>

          <div className='rounded-lg border border-neutral-lighter bg-white p-4 shadow-sm md:p-8'>
            <PushpayEmbed handle='christfellowship' />
          </div>

          <div
            role='alert'
            className='mt-6 border-l-4 border-warning bg-white p-4 text-sm leading-6'
          >
            <strong>Production account.</strong> Form is interactive and any
            completed gift is real. Stop before submission.
          </div>
        </section>

        <aside aria-labelledby='findings-heading' className='lg:pt-1'>
          <h2 id='findings-heading' className='heading-h4'>
            Findings from example HTML
          </h2>
          <div className='mt-6 space-y-4'>
            <Finding title='Not an iframe'>
              Pushpay script creates a host element with an open{' '}
              <Code>shadowRoot</Code>. Page JavaScript can inspect it and append
              scoped CSS.
            </Finding>
            <Finding title='Styling stays isolated'>
              Styles must be inserted into Shadow DOM. Normal page CSS cannot
              cross boundary. This demo injects one tagged stylesheet and leaves
              global page styles untouched.
            </Finding>
            <Finding title='Form remains Pushpay-owned'>
              Amount, funds, campus, recurring settings, validation, and
              submission remain real Pushpay controls. Styling does not clone
              payment behavior.
            </Finding>
            <Finding title='Re-renders need handling'>
              Pushpay can replace internal nodes as form state changes. A narrow{' '}
              <Code>MutationObserver</Code> restores stylesheet if host
              re-renders.
            </Finding>
            <Finding title='Payment iframe is separate'>
              Google Pay or other provider-owned iframe contents remain behind
              cross-origin boundary. Shadow DOM access does not bypass iframe
              security.
            </Finding>
            <Finding title='Fallback stays functional'>
              If styling cannot attach within 20 seconds, widget remains visible
              with Pushpay defaults. Styling failure never blocks giving.
            </Finding>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Finding({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className='rounded-lg border border-neutral-lighter bg-white p-5'>
      <h3 className='font-bold text-navy'>{title}</h3>
      <p className='mt-2 text-sm leading-6 text-text-secondary'>{children}</p>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className='rounded bg-gray px-1.5 py-0.5 font-mono text-xs text-text-primary'>
      {children}
    </code>
  );
}
