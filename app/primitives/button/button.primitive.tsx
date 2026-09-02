import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { Link } from 'react-router-dom';

export const button = cva(
  [
    'justify-center',
    'inline-flex',
    'items-center',
    'text-center',
    'border',
    'transition-colors',
    'delay-50',
    'rounded-md',
    'cursor-pointer',
    'font-semibold',
  ],
  {
    variants: {
      intent: {
        primary: [
          'bg-ocean',
          'text-white',
          'border-transparent',
          'hover:enabled:bg-navy',
        ],
        secondary: [
          'bg-transparent',
          'text-ocean',
          'border-ocean',
          'hover:enabled:bg-ocean',
          'hover:enabled:text-white',
        ],
        white: ['bg-white', 'text-ocean', 'hover:enabled:bg-[#D9D9D9]'],
        secondaryWhite: [
          'bg-transparent',
          'text-white',
          'border-white',
          'hover:enabled:bg-white',
          'hover:enabled:text-ocean',
        ],
      },
      size: {
        sm: ['min-w-20', 'h-full', 'min-h-10', 'text-sm', 'px-4'],
        md: ['min-w-24', 'h-full', 'min-h-11', 'px-6', 'py-2'],
        lg: ['min-w-24', 'h-full', 'min-h-12', 'text-lg', 'px-6', 'py-3'],
      },
      underline: { true: ['underline'], false: [] },
    },
    defaultVariants: {
      intent: 'primary',
      size: 'lg',
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  underline?: boolean;
  linkClassName?: string;
  href?: string;
  target?: string;
  /** Forwarded to the underlying `Link` when `href` is set (see react-router `LinkProps`). */
  state?: unknown;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  prefetch?: 'intent' | 'render' | 'none' | 'viewport';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      linkClassName,
      prefetch = 'intent',
      className,
      target,
      intent,
      href,
      state,
      onClick,
      size,
      underline,
      ...props
    },
    ref,
  ) => {
    if (href) {
      return (
        <Link
          to={href}
          state={state}
          prefetch={prefetch}
          target={target ? target : href?.includes('http') ? '_blank' : ''}
          className={linkClassName}
        >
          <button
            className={twMerge(button({ intent, size, className, underline }))}
            ref={ref}
            {...props}
          >
            {props.children}
          </button>
        </Link>
      );
    }

    return (
      <button
        className={twMerge(button({ intent, size, className, underline }))}
        onClick={onClick}
        ref={ref}
        {...props}
      >
        {props.children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
