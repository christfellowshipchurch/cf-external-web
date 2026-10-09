import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../button.primitive';

function renderButton(props: React.ComponentProps<typeof Button>) {
  return render(
    <MemoryRouter>
      <Button {...props} />
    </MemoryRouter>,
  );
}

describe('Button', () => {
  it('renders children text', () => {
    renderButton({ children: 'Click me' });
    expect(
      screen.getByRole('button', { name: 'Click me' }),
    ).toBeInTheDocument();
  });

  it('applies primary intent styles by default', () => {
    renderButton({ children: 'Primary' });
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-ocean');
  });

  it('applies secondary intent styles', () => {
    renderButton({ children: 'Secondary', intent: 'secondary' });
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-ocean');
  });

  it('applies white intent styles', () => {
    renderButton({ children: 'White', intent: 'white' });
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-white');
  });

  it('applies sm size styles', () => {
    renderButton({ children: 'Small', size: 'sm' });
    expect(screen.getByRole('button').className).toContain('min-w-20');
  });

  it('applies underline class when underline is true', () => {
    renderButton({ children: 'Underline', underline: true });
    expect(screen.getByRole('button').className).toContain('underline');
  });

  it('wraps in Link when href is provided', () => {
    renderButton({ children: 'Go', href: '/about' });
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/about');
  });

  it('sets target=_blank for external href', () => {
    renderButton({ children: 'External', href: 'https://example.com' });
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('does not set _blank for internal href', () => {
    renderButton({ children: 'Internal', href: '/about' });
    const link = screen.getByRole('link');
    // Internal links get empty target or no _blank
    expect(link.getAttribute('target')).not.toBe('_blank');
  });

  it('fires onClick handler', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderButton({ children: 'Click', onClick });
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders as disabled when disabled prop is set', () => {
    renderButton({ children: 'Disabled', disabled: true });
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders without href as plain button', () => {
    renderButton({ children: 'No href' });
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
