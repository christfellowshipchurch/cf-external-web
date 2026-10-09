import { MemoryRouter } from 'react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ArticleAuthor from '../article-author.component';
import type { AuthorProps } from '../../partials/hero.partial';

const toddAndJulieAuthor: AuthorProps = {
  fullName: 'Todd and Julie Mullins',
  authorAttributes: {
    authorId: '123',
    pathname: 'todd-julie-mullins',
  },
};

function renderArticleAuthor(author: AuthorProps) {
  return render(
    <MemoryRouter>
      <ArticleAuthor
        author={author}
        publishDate='January 22, 2025'
        readTime={4}
      />
    </MemoryRouter>,
  );
}

describe('ArticleAuthor', () => {
  it('splits Todd and Julie byline links into individual author pages', () => {
    renderArticleAuthor(toddAndJulieAuthor);

    expect(screen.getByRole('link', { name: 'Todd' })).toHaveAttribute(
      'href',
      '/author/todd-mullins',
    );
    expect(screen.getByRole('link', { name: 'Julie' })).toHaveAttribute(
      'href',
      '/author/julie-mullins',
    );
    expect(screen.getByText(/Authored by/i)).toHaveTextContent(
      'Authored by Todd and Julie Mullins',
    );
  });

  it('does not link Todd and Julie content to the combined author page', () => {
    renderArticleAuthor(toddAndJulieAuthor);

    const links = screen.getAllByRole('link');
    expect(
      links.some(
        (link) => link.getAttribute('href') === '/author/todd-julie-mullins',
      ),
    ).toBe(false);
  });

  it('links the byline to the author page when a pathname exists', () => {
    renderArticleAuthor({
      fullName: 'Ryan McDermott',
      authorAttributes: { authorId: '85081', pathname: 'ryan-mcdermott' },
    });

    const nameLink = screen.getByRole('link', { name: 'Ryan McDermott' });
    expect(nameLink).toHaveAttribute('href', '/author/ryan-mcdermott');
    // Counterpart to the no-pathname case: a real author page keeps the underline.
    expect(nameLink).toHaveClass('underline');
  });

  // Authors with no Rock Pathname have no author page — /author/:slug resolves by
  // pathname alone, so linking the byline to the authorId GUID sent readers to a
  // 404. The name must still be shown, just not as a link.
  describe('author with no pathname', () => {
    const authorWithoutPathname: AuthorProps = {
      fullName: 'Amanda Gonzalez',
      authorAttributes: {
        authorId: 'f2a3bea3-7c3c-44e5-a052-8924e3bc43c0',
        pathname: '',
      },
    };

    it('still displays the author name', () => {
      renderArticleAuthor(authorWithoutPathname);

      expect(screen.getByText(/Authored by/i)).toHaveTextContent(
        'Authored by Amanda Gonzalez',
      );
    });

    it('renders no link at all, so nothing points at a 404', () => {
      renderArticleAuthor(authorWithoutPathname);

      expect(screen.queryAllByRole('link')).toHaveLength(0);
    });

    it('does not underline the name', () => {
      renderArticleAuthor(authorWithoutPathname);

      const byline = screen.getByText(/Authored by/i);
      expect(byline.querySelector('.underline')).toBeNull();
    });

    it('treats the literal string "undefined" as no pathname', () => {
      renderArticleAuthor({
        ...authorWithoutPathname,
        authorAttributes: { authorId: 'abc', pathname: 'undefined' },
      });

      expect(screen.queryAllByRole('link')).toHaveLength(0);
    });
  });
});
