import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StudySingleBasicContent } from '../basic-content.partial';
import type { StudyHitType } from '../../../types';

const writeText = vi.fn();

const studyHit: StudyHitType = {
  objectID: 'study-1',
  id: 'study-1',
  rockItemId: 123,
  title: 'Foundations of Faith',
  studyType: 'Study',
  url: '/studies-and-resources/foundations-of-faith',
  content: '<p>Study description.</p>',
  coverImage: { sources: [{ uri: 'https://example.com/study.jpg' }] },
  subtitle: 'A test study',
  summary: 'Summary',
  description: 'Description',
  duration: 'Short',
  topic: 'Spiritual Growth',
  format: 'Video',
  audience: 'Everyone',
  source: 'Christ Fellowship',
  author: {
    firstName: 'Christ Fellowship',
    lastName: 'Team',
  },
  _highlightResult: {
    title: {
      value: 'Foundations of Faith',
      matchLevel: 'none',
      matchedWords: [],
    },
    summary: {
      value: 'Summary',
      matchLevel: 'none',
      matchedWords: [],
    },
    routing: {
      pathname: {
        value: '/studies-and-resources/foundations-of-faith',
        matchLevel: 'none',
        matchedWords: [],
      },
    },
    htmlContent: [],
  },
  __position: 1,
};

function renderBasicContent() {
  return render(
    <MemoryRouter initialEntries={['/studies-and-resources/foundations']}>
      <StudySingleBasicContent
        hit={studyHit}
        curriculum={[]}
        callsToAction={[]}
        trailerWistiaId={null}
      />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.history.pushState(
    {},
    '',
    '/studies-and-resources/foundations?source=test',
  );
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('StudySingleBasicContent', () => {
  it('copies the current page URL and confirms when the copy link control is clicked', async () => {
    renderBasicContent();

    expect(
      screen.getAllByText('Want to share this resource?').length,
    ).toBeGreaterThan(0);

    const copyButtons = screen.getAllByRole('button', {
      name: 'Copy Link',
    });
    expect(copyButtons.length).toBeGreaterThan(0);

    fireEvent.click(copyButtons[0]);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(window.location.href);
    });
    expect(screen.getByText('Link copied')).toBeInTheDocument();
  });
});
