import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Font Styles – Design System',
    description: 'Typography styles and font system documentation.',
    noIndex: true,
  });
};

export default function FontStylesPage() {
  return (
    <div className='min-h-screen bg-background-primary'>
      <div className='max-w-screen-content mx-auto px-4 py-8'>
        {/* Header */}
        <div className='mb-12'>
          <h1 className='heading-h1 text-text-primary mb-4'>Font Styles</h1>
          <p className='text-lg text-text-secondary max-w-3xl'>
            Comprehensive overview of all typography styles in our design
            system. This page showcases headings, body text, font families, and
            color variations.
          </p>
        </div>

        {/* Font Families Section */}
        <section className='mb-16'>
          <h2 className='heading-h2 text-text-primary mb-8'>Font Families</h2>
          <div className='grid gap-8 md:grid-cols-2'>
            <div className='p-6 border border-border-secondary rounded-lg'>
              <h3 className='heading-h4 text-text-primary mb-4'>
                Proxima Nova (Sans)
              </h3>
              <div className='space-y-4'>
                <p className='text-2xl font-light'>
                  Light - The quick brown fox jumps over the lazy dog
                </p>
                <p className='text-2xl font-normal'>
                  Regular - The quick brown fox jumps over the lazy dog
                </p>
                <p className='text-2xl font-medium'>
                  Medium - The quick brown fox jumps over the lazy dog
                </p>
                <p className='text-2xl font-semibold'>
                  Semibold - The quick brown fox jumps over the lazy dog
                </p>
                <p className='text-2xl font-bold'>
                  Bold - The quick brown fox jumps over the lazy dog
                </p>
                <p className='text-2xl font-extrabold'>
                  Extrabold - The quick brown fox jumps over the lazy dog
                </p>
              </div>
            </div>
            <div className='p-6 border border-border-secondary rounded-lg'>
              <h3 className='heading-h4 text-text-primary mb-4'>
                Merriweather (Serif)
              </h3>
              <div className='space-y-4'>
                <p className='text-2xl font-light font-serif'>
                  Light - The quick brown fox jumps over the lazy dog
                </p>
                <p className='text-2xl font-normal font-serif'>
                  Regular - The quick brown fox jumps over the lazy dog
                </p>
                <p className='text-2xl font-medium font-serif'>
                  Medium - The quick brown fox jumps over the lazy dog
                </p>
                <p className='text-2xl font-semibold font-serif'>
                  Semibold - The quick brown fox jumps over the lazy dog
                </p>
                <p className='text-2xl font-bold font-serif'>
                  Bold - The quick brown fox jumps over the lazy dog
                </p>
                <p className='text-2xl font-extrabold font-serif'>
                  Extrabold - The quick brown fox jumps over the lazy dog
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Headings Section */}
        <section className='mb-16'>
          <h2 className='heading-h2 text-text-primary mb-8'>Headings</h2>
          <div className='space-y-8'>
            <div className='p-6 border border-border-secondary rounded-lg'>
              <h1 className='heading-h1 text-text-primary mb-2'>Heading H1</h1>
              <p className='text-text-secondary'>
                Mobile: 52px / Desktop: 100px - Line Height: 120% / 100%
              </p>
              <p className='text-text-secondary'>Font Weight: Extrabold</p>
            </div>

            <div className='p-6 border border-border-secondary rounded-lg'>
              <h2 className='heading-h2 text-text-primary mb-2'>Heading H2</h2>
              <p className='text-text-secondary'>
                Mobile: 48px / Desktop: 52px - Line Height: 120% / 100%
              </p>
              <p className='text-text-secondary'>Font Weight: Extrabold</p>
            </div>

            <div className='p-6 border border-border-secondary rounded-lg'>
              <h3 className='heading-h3 text-text-primary mb-2'>Heading H3</h3>
              <p className='text-text-secondary'>
                Mobile: 40px / Desktop: 32px - Line Height: 120% / 100%
              </p>
              <p className='text-text-secondary'>Font Weight: Extrabold</p>
            </div>

            <div className='p-6 border border-border-secondary rounded-lg'>
              <h4 className='heading-h4 text-text-primary mb-2'>Heading H4</h4>
              <p className='text-text-secondary'>
                Mobile: 28px / Desktop: 24px - Line Height: 140% / 130%
              </p>
              <p className='text-text-secondary'>Font Weight: Extrabold</p>
            </div>

            <div className='p-6 border border-border-secondary rounded-lg'>
              <h5 className='heading-h5 text-text-primary mb-2'>Heading H5</h5>
              <p className='text-text-secondary'>
                Mobile: 24px / Desktop: 18px - Line Height: 140%
              </p>
              <p className='text-text-secondary'>Font Weight: Extrabold</p>
            </div>

            <div className='p-6 border border-border-secondary rounded-lg'>
              <h6 className='heading-h6 text-text-primary mb-2'>Heading H6</h6>
              <p className='text-text-secondary'>
                Mobile: 18px / Desktop: 16px - Line Height: 140%
              </p>
              <p className='text-text-secondary'>Font Weight: Extrabold</p>
            </div>
          </div>
        </section>

        {/* Body Text Section */}
        <section className='mb-16'>
          <h2 className='heading-h2 text-text-primary mb-8'>Body Text</h2>
          <div className='grid gap-8 md:grid-cols-2'>
            <div className='p-6 border border-border-secondary rounded-lg'>
              <h3 className='heading-h4 text-text-primary mb-4'>Text Sizes</h3>
              <div className='space-y-4'>
                <p className='text-xs text-text-primary'>
                  Text XS - Extra small text for captions and labels
                </p>
                <p className='text-sm text-text-primary'>
                  Text SM - Small text for secondary information
                </p>
                <p className='text-base text-text-primary'>
                  Text Base - Default body text size
                </p>
                <p className='text-lg text-text-primary'>
                  Text LG - Large body text for emphasis
                </p>
                <p className='text-xl text-text-primary'>
                  Text XL - Extra large text for highlights
                </p>
                <p className='text-2xl text-text-primary'>
                  Text 2XL - Very large text for special emphasis
                </p>
                <p className='text-3xl text-text-primary'>
                  Text 3XL - Extra large display text
                </p>
                <p className='text-4xl text-text-primary'>
                  Text 4XL - Large display text
                </p>
                <p className='text-5xl text-text-primary'>
                  Text 5XL - Extra large display text
                </p>
                <p className='text-6xl text-text-primary'>
                  Text 6XL - Massive display text
                </p>
              </div>
            </div>

            <div className='p-6 border border-border-secondary rounded-lg'>
              <h3 className='heading-h4 text-text-primary mb-4'>
                Font Weights
              </h3>
              <div className='space-y-4'>
                <p className='text-lg font-thin text-text-primary'>
                  Thin (100) - Very light weight text
                </p>
                <p className='text-lg font-extralight text-text-primary'>
                  Extralight (200) - Extra light weight text
                </p>
                <p className='text-lg font-light text-text-primary'>
                  Light (300) - Light weight text
                </p>
                <p className='text-lg font-normal text-text-primary'>
                  Normal (400) - Regular weight text
                </p>
                <p className='text-lg font-medium text-text-primary'>
                  Medium (500) - Medium weight text
                </p>
                <p className='text-lg font-semibold text-text-primary'>
                  Semibold (600) - Semi-bold weight text
                </p>
                <p className='text-lg font-bold text-text-primary'>
                  Bold (700) - Bold weight text
                </p>
                <p className='text-lg font-extrabold text-text-primary'>
                  Extrabold (800) - Extra bold weight text
                </p>
                <p className='text-lg font-black text-text-primary'>
                  Black (900) - Black weight text
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Text Colors Section */}
        <section className='mb-16'>
          <h2 className='heading-h2 text-text-primary mb-8'>Text Colors</h2>
          <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
            <div className='p-6 border border-border-secondary rounded-lg'>
              <h3 className='heading-h4 text-text-primary mb-4'>
                Primary Colors
              </h3>
              <div className='space-y-3'>
                <p className='text-text-primary'>
                  Text Primary - Main text color
                </p>
                <p className='text-text-secondary'>
                  Text Secondary - Secondary text color
                </p>
                <p className='text-text-alternate bg-text-primary p-2 rounded'>
                  Text Alternate - Alternate text color
                </p>
                <p className='text-text-success'>
                  Text Success - Success state text
                </p>
                <p className='text-text-error'>Text Error - Error state text</p>
              </div>
            </div>

            <div className='p-6 border border-border-secondary rounded-lg'>
              <h3 className='heading-h4 text-text-primary mb-4'>
                Brand Colors
              </h3>
              <div className='space-y-3'>
                <p className='text-navy'>Navy - Primary brand color</p>
                <p className='text-darkNavy'>Dark Navy - Dark brand variant</p>
                <p className='text-ocean'>Ocean - Secondary brand color</p>
                <p className='text-ocean-web'>
                  Ocean Web - Lighter digital / UI accent
                </p>
                <p className='text-cottonCandy'>Cotton Candy - Accent color</p>
                <p className='text-apple'>Apple - Alert color</p>
                <p className='text-tangerine'>Tangerine - Warning color</p>
              </div>
            </div>

            <div className='p-6 border border-border-secondary rounded-lg'>
              <h3 className='heading-h4 text-text-primary mb-4'>
                Neutral Colors
              </h3>
              <div className='space-y-3'>
                <p className='text-neutral-lightest'>
                  Neutral Lightest - Very light gray
                </p>
                <p className='text-neutral-lighter'>
                  Neutral Lighter - Light gray
                </p>
                <p className='text-neutral-light'>
                  Neutral Light - Medium light gray
                </p>
                <p className='text-neutral-default'>
                  Neutral Default - Medium gray
                </p>
                <p className='text-neutral-dark'>Neutral Dark - Dark gray</p>
                <p className='text-neutral-darker'>
                  Neutral Darker - Very dark gray
                </p>
                <p className='text-neutral-darkest'>
                  Neutral Darkest - Almost black
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Link Styles Section */}
        <section className='mb-16'>
          <h2 className='heading-h2 text-text-primary mb-8'>Link Styles</h2>
          <div className='grid gap-6 md:grid-cols-3'>
            <div className='p-6 border border-border-secondary rounded-lg'>
              <h3 className='heading-h4 text-text-primary mb-4'>Link Colors</h3>
              <div className='space-y-3'>
                <a href='#' className='text-link-primary hover:underline block'>
                  Link Primary
                </a>
                <a
                  href='#'
                  className='text-link-secondary hover:underline block'
                >
                  Link Secondary
                </a>
                <a
                  href='#'
                  className='text-link-alternate bg-text-primary p-2 rounded hover:underline block'
                >
                  Link Alternate
                </a>
              </div>
            </div>

            <div className='p-6 border border-border-secondary rounded-lg'>
              <h3 className='heading-h4 text-text-primary mb-4'>
                Interactive States
              </h3>
              <div className='space-y-3'>
                <a
                  href='#'
                  className='text-link-primary hover:text-ocean transition-colors block'
                >
                  Hover State
                </a>
                <a
                  href='#'
                  className='text-link-primary focus:outline-none focus:ring-2 focus:ring-ocean focus:ring-offset-2 block'
                >
                  Focus State
                </a>
                <a
                  href='#'
                  className='text-link-primary visited:text-neutral-dark block'
                >
                  Visited State
                </a>
              </div>
            </div>

            <div className='p-6 border border-border-secondary rounded-lg'>
              <h3 className='heading-h4 text-text-primary mb-4'>Button Text</h3>
              <div className='space-y-3'>
                <button className='bg-navy text-white px-4 py-2 rounded hover:bg-darkNavy transition-colors'>
                  Primary Button
                </button>
                <button className='bg-transparent border border-navy text-navy px-4 py-2 rounded hover:bg-navy hover:text-white transition-colors'>
                  Secondary Button
                </button>
                <button className='bg-ocean text-white px-4 py-2 rounded hover:bg-darkNavy transition-colors'>
                  Accent Button
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Sample Content Section */}
        <section className='mb-16'>
          <h2 className='heading-h2 text-text-primary mb-8'>Sample Content</h2>
          <div className='grid gap-8 md:grid-cols-2'>
            <div className='p-6 border border-border-secondary rounded-lg'>
              <h3 className='heading-h3 text-text-primary mb-4'>
                Article Example
              </h3>
              <p className='text-text-secondary mb-4'>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris
                nisi ut aliquip ex ea commodo consequat.
              </p>
              <p className='text-text-primary mb-4'>
                Duis aute irure dolor in reprehenderit in voluptate velit esse
                cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
                cupidatat non proident, sunt in culpa qui officia deserunt
                mollit anim id est laborum.
              </p>
              <blockquote className='border-l-4 border-ocean pl-4 italic text-text-secondary'>
                "This is a blockquote example showing how quoted text appears in
                our design system."
              </blockquote>
            </div>

            <div className='p-6 border border-border-secondary rounded-lg'>
              <h3 className='heading-h3 text-text-primary mb-4'>
                Form Example
              </h3>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-text-primary mb-2'>
                    Form Label
                  </label>
                  <input
                    type='text'
                    placeholder='Placeholder text'
                    className='w-full px-3 py-2 border border-border-secondary rounded text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-ocean focus:border-transparent'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-text-primary mb-2'>
                    Error State
                  </label>
                  <input
                    type='text'
                    value='Invalid input'
                    className='w-full px-3 py-2 border border-text-error rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-text-error focus:border-transparent'
                  />
                  <p className='text-sm text-text-error mt-1'>
                    This field is required
                  </p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-text-primary mb-2'>
                    Success State
                  </label>
                  <input
                    type='text'
                    value='Valid input'
                    className='w-full px-3 py-2 border border-text-success rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-text-success focus:border-transparent'
                  />
                  <p className='text-sm text-text-success mt-1'>
                    ✓ Input is valid
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Responsive Text Section */}
        <section className='mb-16'>
          <h2 className='heading-h2 text-text-primary mb-8'>Responsive Text</h2>
          <div className='p-6 border border-border-secondary rounded-lg'>
            <h3 className='heading-h4 text-text-primary mb-4'>
              Responsive Heading Example
            </h3>
            <p className='text-text-secondary mb-4'>
              This heading will be 52px on mobile and 100px on desktop (lg
              breakpoint and above):
            </p>
            <h1 className='heading-h1 text-text-primary mb-4'>
              Responsive Heading
            </h1>
            <p className='text-text-secondary'>
              Resize your browser window to see the responsive behavior in
              action.
            </p>
          </div>
        </section>

        {/* Accessibility Section */}
        <section className='mb-16'>
          <h2 className='heading-h2 text-text-primary mb-8'>
            Accessibility & Best Practices
          </h2>
          <div className='grid gap-6 md:grid-cols-2'>
            <div className='p-6 border border-border-secondary rounded-lg'>
              <h3 className='heading-h4 text-text-primary mb-4'>
                Color Contrast
              </h3>
              <div className='space-y-3'>
                <p className='text-text-primary bg-background-primary p-2 rounded'>
                  Primary text on white background (High contrast)
                </p>
                <p className='text-text-secondary bg-background-primary p-2 rounded'>
                  Secondary text on white background (Medium contrast)
                </p>
                <p className='text-text-alternate bg-text-primary p-2 rounded'>
                  Alternate text on dark background (High contrast)
                </p>
              </div>
            </div>

            <div className='p-6 border border-border-secondary rounded-lg'>
              <h3 className='heading-h4 text-text-primary mb-4'>
                Focus Indicators
              </h3>
              <div className='space-y-3'>
                <button className='bg-navy text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-ocean focus:ring-offset-2'>
                  Focusable Button
                </button>
                <a
                  href='#'
                  className='text-link-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ocean focus:ring-offset-2 inline-block'
                >
                  Focusable Link
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
