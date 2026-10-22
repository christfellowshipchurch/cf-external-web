import { describe, it, expect } from 'vitest';
import {
  createMeta,
  SITE_NAME,
  DEFAULT_META_IMAGE,
  DEFAULT_KEYWORDS,
  DEFAULT_GENERATOR,
} from '../meta-utils';

describe('createMeta', () => {
  it('appends site name to title when not already present', () => {
    const meta = createMeta({ title: 'About', description: 'About page' });
    const titleEntry = meta.find((m) => 'title' in m);
    expect(titleEntry).toEqual({ title: `About | ${SITE_NAME}` });
  });

  it('does not double-append site name', () => {
    const meta = createMeta({
      title: `About | ${SITE_NAME}`,
      description: 'About page',
    });
    const titleEntry = meta.find((m) => 'title' in m);
    expect(titleEntry).toEqual({ title: `About | ${SITE_NAME}` });
  });

  it('leaves the title as given when exactTitle is set', () => {
    const meta = createMeta({
      title: 'Christ Fellowship Español en Stuart, FL',
      exactTitle: true,
      description: 'Test',
    });
    expect(meta.find((m) => 'title' in m)).toEqual({
      title: 'Christ Fellowship Español en Stuart, FL',
    });
  });

  it('includes description in meta and OG tags', () => {
    const meta = createMeta({ title: 'Test', description: 'Test description' });
    const descMeta = meta.find((m) => 'name' in m && m.name === 'description');
    const ogDesc = meta.find(
      (m) => 'property' in m && m.property === 'og:description',
    );
    expect((descMeta as { content?: string })?.content).toBe(
      'Test description',
    );
    expect((ogDesc as { content?: string })?.content).toBe('Test description');
  });

  it('uses default image when none provided', () => {
    const meta = createMeta({ title: 'Test', description: 'Test' });
    const ogImage = meta.find(
      (m) => 'property' in m && m.property === 'og:image',
    );
    expect((ogImage as { content?: string })?.content).toContain(
      DEFAULT_META_IMAGE,
    );
  });

  it('uses custom image when provided as absolute URL', () => {
    const meta = createMeta({
      title: 'Test',
      description: 'Test',
      image: 'https://cdn.example.com/img.jpg',
    });
    const ogImage = meta.find(
      (m) => 'property' in m && m.property === 'og:image',
    );
    expect((ogImage as { content?: string })?.content).toBe(
      'https://cdn.example.com/img.jpg',
    );
  });

  it('includes canonical link when path is provided', () => {
    const meta = createMeta({
      title: 'Test',
      description: 'Test',
      path: '/about',
    });
    const canonical = meta.find(
      (m) => 'tagName' in m && (m as { tagName: string }).tagName === 'link',
    );
    expect(canonical).toBeDefined();
    expect((canonical as { href?: string })?.href).toContain('/about');
  });

  it('sets noindex when noIndex is true', () => {
    const meta = createMeta({
      title: 'Test',
      description: 'Test',
      noIndex: true,
    });
    const robots = meta.find((m) => 'name' in m && m.name === 'robots');
    expect((robots as { content?: string })?.content).toBe('noindex, nofollow');
  });

  it('sets index,follow by default', () => {
    const meta = createMeta({ title: 'Test', description: 'Test' });
    const robots = meta.find((m) => 'name' in m && m.name === 'robots');
    expect((robots as { content?: string })?.content).toBe('index, follow');
  });

  it('uses default keywords when none provided', () => {
    const meta = createMeta({ title: 'Test', description: 'Test' });
    const keywords = meta.find((m) => 'name' in m && m.name === 'keywords');
    expect((keywords as { content?: string })?.content).toBe(DEFAULT_KEYWORDS);
  });

  it('uses custom keywords when provided', () => {
    const meta = createMeta({
      title: 'Test',
      description: 'Test',
      keywords: 'custom, keywords',
    });
    const keywords = meta.find((m) => 'name' in m && m.name === 'keywords');
    expect((keywords as { content?: string })?.content).toBe(
      'custom, keywords',
    );
  });

  it('includes author meta when author is provided', () => {
    const meta = createMeta({
      title: 'Test',
      description: 'Test',
      author: 'Jane Doe',
    });
    const authorMeta = meta.find((m) => 'name' in m && m.name === 'author');
    const articleAuthor = meta.find(
      (m) => 'property' in m && m.property === 'article:author',
    );
    expect((authorMeta as { content?: string })?.content).toBe('Jane Doe');
    expect((articleAuthor as { content?: string })?.content).toBe('Jane Doe');
  });

  it('does not include author tags when author is empty whitespace', () => {
    const meta = createMeta({
      title: 'Test',
      description: 'Test',
      author: '   ',
    });
    const authorMeta = meta.find((m) => 'name' in m && m.name === 'author');
    expect(authorMeta).toBeUndefined();
  });

  it('uses default generator', () => {
    const meta = createMeta({ title: 'Test', description: 'Test' });
    const generator = meta.find((m) => 'name' in m && m.name === 'generator');
    expect((generator as { content?: string })?.content).toBe(
      DEFAULT_GENERATOR,
    );
  });

  it('includes license when provided', () => {
    const meta = createMeta({
      title: 'Test',
      description: 'Test',
      license: 'MIT',
    });
    const license = meta.find((m) => 'name' in m && m.name === 'license');
    expect((license as { content?: string })?.content).toBe('MIT');
  });

  it('includes twitter card tags', () => {
    const meta = createMeta({ title: 'Test', description: 'Test desc' });
    const twitterCard = meta.find(
      (m) => 'name' in m && m.name === 'twitter:card',
    );
    const twitterTitle = meta.find(
      (m) => 'name' in m && m.name === 'twitter:title',
    );
    expect((twitterCard as { content?: string })?.content).toBe(
      'summary_large_image',
    );
    expect((twitterTitle as { content?: string })?.content).toContain('Test');
  });

  it('includes og:type as website', () => {
    const meta = createMeta({ title: 'Test', description: 'Test' });
    const ogType = meta.find(
      (m) => 'property' in m && m.property === 'og:type',
    );
    expect((ogType as { content?: string })?.content).toBe('website');
  });

  it('includes og:site_name', () => {
    const meta = createMeta({ title: 'Test', description: 'Test' });
    const ogSite = meta.find(
      (m) => 'property' in m && m.property === 'og:site_name',
    );
    expect((ogSite as { content?: string })?.content).toBe(SITE_NAME);
  });

  it('includes twitter:creator when author is provided', () => {
    const meta = createMeta({
      title: 'Test',
      description: 'Test',
      author: 'Todd Mullins',
    });
    const creator = meta.find(
      (m) => 'name' in m && m.name === 'twitter:creator',
    );
    expect((creator as { content?: string })?.content).toBe('Todd Mullins');
  });

  it('does not include license when not provided', () => {
    const meta = createMeta({ title: 'Test', description: 'Test' });
    const license = meta.find((m) => 'name' in m && m.name === 'license');
    expect(license).toBeUndefined();
  });
});
