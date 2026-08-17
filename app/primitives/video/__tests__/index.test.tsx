import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Video } from '../video.primitive';

beforeEach(() => {
  window._wq = [];
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Video - src mode', () => {
  it('renders a <video> element when src is provided', () => {
    render(<Video src='/video.mp4' />);
    expect(document.querySelector('video')).toBeInTheDocument();
  });

  it('sets the src attribute on <video>', () => {
    render(<Video src='/video.mp4' />);
    expect(document.querySelector('video')).toHaveAttribute(
      'src',
      '/video.mp4',
    );
  });

  it('passes autoPlay prop to <video>', () => {
    render(<Video src='/video.mp4' autoPlay />);
    expect(document.querySelector('video')).toHaveAttribute('autoplay');
  });

  it('sets playsInline so iOS/iPadOS play inline instead of fullscreen', () => {
    render(<Video src='/video.mp4' autoPlay muted />);
    const video = document.querySelector('video');
    expect(video).toHaveAttribute('playsinline');
    expect(video).toHaveAttribute('webkit-playsinline', 'true');
  });

  it('preloads when autoPlay is set so mobile playback can start', () => {
    render(<Video src='/video.mp4' autoPlay muted />);
    expect(document.querySelector('video')).toHaveAttribute('preload', 'auto');
  });

  it('calls play() when autoPlay is set so iOS can start muted inline playback', () => {
    render(<Video src='/video.mp4' autoPlay muted />);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('retries play() when the video can play so mobile autoplay is not lost', () => {
    render(<Video src='/video.mp4' autoPlay muted />);
    const video = document.querySelector('video');
    expect(video).toBeTruthy();
    vi.mocked(HTMLMediaElement.prototype.play).mockClear();
    video?.dispatchEvent(new Event('canplay'));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('does not call play() when autoPlay is false', () => {
    render(<Video src='/video.mp4' autoPlay={false} muted />);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('does not set autoplay when autoPlay is false', () => {
    render(<Video src='/video.mp4' autoPlay={false} />);
    expect(document.querySelector('video')).not.toHaveAttribute('autoplay');
  });

  it('passes loop prop to <video>', () => {
    render(<Video src='/video.mp4' loop />);
    expect(document.querySelector('video')).toHaveAttribute('loop');
  });

  it('passes muted prop to <video>', () => {
    render(<Video src='/video.mp4' muted />);
    // jsdom reflects muted as a DOM property, not an HTML attribute
    const video = document.querySelector('video');
    expect((video as { muted: boolean }).muted).toBe(true);
  });

  it('passes controls prop to <video>', () => {
    render(<Video src='/video.mp4' controls />);
    expect(document.querySelector('video')).toHaveAttribute('controls');
  });

  it('applies className to <video>', () => {
    render(<Video src='/video.mp4' className='my-video' />);
    expect(
      document.querySelector('video')?.classList.contains('my-video'),
    ).toBe(true);
  });

  it('does not render an <iframe> when src is provided', () => {
    render(<Video src='/video.mp4' />);
    expect(document.querySelector('iframe')).not.toBeInTheDocument();
  });
});

describe('Video - wistiaId mode', () => {
  it('renders an <iframe> when wistiaId is provided', () => {
    render(<Video wistiaId='abc123' />);
    expect(document.querySelector('iframe')).toBeInTheDocument();
  });

  it('iframe src contains the wistiaId', () => {
    render(<Video wistiaId='abc123' />);
    expect(document.querySelector('iframe')).toHaveAttribute(
      'src',
      expect.stringContaining('abc123'),
    );
  });

  it('iframe src contains fitStrategy=cover', () => {
    render(<Video wistiaId='abc123' />);
    expect(document.querySelector('iframe')).toHaveAttribute(
      'src',
      expect.stringContaining('fitStrategy=cover'),
    );
  });

  it("iframe has allow='autoplay; fullscreen'", () => {
    render(<Video wistiaId='abc123' />);
    expect(document.querySelector('iframe')).toHaveAttribute(
      'allow',
      'autoplay; fullscreen',
    );
  });

  it('applies className to iframe', () => {
    render(<Video wistiaId='abc123' className='my-class' />);
    expect(
      document.querySelector('iframe')?.classList.contains('my-class'),
    ).toBe(true);
  });

  it('does not render a <video> element', () => {
    render(<Video wistiaId='abc123' />);
    expect(document.querySelector('video')).not.toBeInTheDocument();
  });

  it('does not add to _wq when autoPlay is not set', () => {
    render(<Video wistiaId='abc123' />);
    expect(window._wq.length).toBe(0);
  });
});
