import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HTMLRenderer } from '../html-renderer.component';

// Mock react-router Link so we don't need a full router context for Link rendering
vi.mock('react-router', async () => {
  const actual =
    await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    Link: ({
      to,
      children,
      className,
    }: {
      to: string;
      children: React.ReactNode;
      className?: string;
    }) => (
      <a href={to} className={className} data-testid='router-link'>
        {children}
      </a>
    ),
  };
});

function renderHTML(
  html: string,
  props?: { className?: string; stripFormattingTags?: boolean },
) {
  return render(
    <MemoryRouter>
      <HTMLRenderer html={html} {...props} />
    </MemoryRouter>,
  );
}

describe('HTMLRenderer - plain text vs HTML', () => {
  it('wraps plain text in a <p> element', () => {
    renderHTML('Hello world');
    expect(document.querySelector('p')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('wraps HTML content in a <div> element', () => {
    renderHTML('<p>Hello world</p>');
    expect(document.querySelector('div.html-renderer')).toBeInTheDocument();
  });

  it('applies custom className to the wrapper', () => {
    renderHTML('Plain text', { className: 'my-class' });
    const wrapper = document.querySelector('.my-class');
    expect(wrapper).toBeInTheDocument();
  });
});

describe('HTMLRenderer - link handling', () => {
  it('converts internal links to router Link (data-testid)', () => {
    renderHTML('<a href="/about">About</a>');
    expect(screen.getByTestId('router-link')).toBeInTheDocument();
    expect(screen.getByTestId('router-link')).toHaveAttribute('href', '/about');
  });

  it('keeps external links as <a> tags', () => {
    renderHTML('<a href="https://example.com">External</a>');
    const link = screen.getByRole('link', { name: 'External' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it("adds rel='noopener noreferrer' for external links with target=_blank", () => {
    renderHTML('<a href="https://example.com" target="_blank">External</a>');
    const link = screen.getByRole('link', { name: 'External' });
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not add rel for external links without target=_blank', () => {
    renderHTML('<a href="https://example.com">External</a>');
    const link = screen.getByRole('link', { name: 'External' });
    expect(link).not.toHaveAttribute('rel');
  });

  // A client-side Link stays in the current tab, so routing an internal
  // target="_blank" link through it discards the author's intent — CMS content
  // relies on this to keep the reader's place (CFDP-4231).
  it('keeps internal links with target=_blank as new-tab <a> tags', () => {
    renderHTML('<a href="/events/journey" target="_blank">Journey</a>');
    expect(screen.queryByTestId('router-link')).not.toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Journey' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/events/journey');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

describe('HTMLRenderer - image handling', () => {
  it('wraps images in a div with class article-image', () => {
    renderHTML('<img src="https://example.com/photo.jpg" />');
    expect(document.querySelector('.article-image')).toBeInTheDocument();
  });

  it('prepends rock URL to relative image src', () => {
    renderHTML('<img src="/Content/photo.jpg" />');
    const img = document.querySelector('img') as HTMLImageElement;
    expect(img.src).toContain('rock.christfellowship.church');
  });

  it('keeps absolute https image src unchanged', () => {
    renderHTML('<img src="https://cdn.example.com/photo.jpg" />');
    const img = document.querySelector('img') as HTMLImageElement;
    expect(img.src).toBe('https://cdn.example.com/photo.jpg');
  });
});

describe('HTMLRenderer - stripFormattingTags', () => {
  it('strips <b> tags but keeps their text content', () => {
    renderHTML('<p><b>Bold text</b></p>', { stripFormattingTags: true });
    expect(screen.getByText('Bold text')).toBeInTheDocument();
    expect(document.querySelector('b')).not.toBeInTheDocument();
  });

  it('strips <strong> tags but keeps their text content', () => {
    renderHTML('<p><strong>Strong text</strong></p>', {
      stripFormattingTags: true,
    });
    expect(screen.getByText('Strong text')).toBeInTheDocument();
    expect(document.querySelector('strong')).not.toBeInTheDocument();
  });

  it('strips <i> tags but keeps their text content', () => {
    renderHTML('<p><i>Italic text</i></p>', { stripFormattingTags: true });
    expect(screen.getByText('Italic text')).toBeInTheDocument();
    expect(document.querySelector('i')).not.toBeInTheDocument();
  });

  it('strips <em> tags but keeps their text content', () => {
    renderHTML('<p><em>Em text</em></p>', { stripFormattingTags: true });
    expect(screen.getByText('Em text')).toBeInTheDocument();
    expect(document.querySelector('em')).not.toBeInTheDocument();
  });

  it('does NOT strip formatting tags when stripFormattingTags is false', () => {
    renderHTML('<p><b>Bold text</b></p>', { stripFormattingTags: false });
    expect(document.querySelector('b')).toBeInTheDocument();
  });
});
