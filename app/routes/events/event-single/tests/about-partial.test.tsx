import { describe, expect, it } from 'vitest';
import { renderWithRouter, screen } from '~/test-utils/render';
import { AboutPartial } from '../partials/about.partial';

describe('AboutPartial summary', () => {
  it('renders the About Section Summary as HTML', () => {
    renderWithRouter(
      <AboutPartial aboutContent='<p>Bring items from our <strong>grocery list</strong>.</p><p><a href="https://example.com/list">See the list</a></p>' />,
    );

    expect(screen.getByText('grocery list').tagName).toBe('STRONG');
    expect(screen.getByRole('link', { name: 'See the list' })).toHaveAttribute(
      'href',
      'https://example.com/list',
    );
    expect(screen.queryByText(/<strong>/)).not.toBeInTheDocument();
  });

  it('still renders a plain-text summary', () => {
    renderWithRouter(
      <AboutPartial aboutContent='You can make a difference.' />,
    );

    expect(screen.getByText('You can make a difference.').tagName).toBe('P');
  });

  it('strips scripts from the summary', () => {
    const { container } = renderWithRouter(
      <AboutPartial aboutContent='<p>Safe</p><script>alert(1)</script>' />,
    );

    expect(screen.getByText('Safe')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
  });
});
