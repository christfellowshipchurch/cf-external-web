import React from 'react';
import { Link, type LinkProps } from 'react-router';
import { Button } from './button.primitive';
import Icon from '../icon';
import { twMerge } from 'tailwind-merge';
import { BaseIconButtonProps } from './types';

export type IconButtonProps = BaseIconButtonProps &
  (
    | ({ to: string } & Omit<LinkProps, keyof BaseIconButtonProps>)
    | { to?: never }
  ) & {
    iconClasses?: string;
  };

export const IconButton: React.FC<IconButtonProps> = ({
  iconClasses,
  children,
  to,
  withRotatingArrow = false,
  className = '',
  iconName = 'arrowBack',
  iconSize = 20,
  onClick,
  ...linkProps
}) => {
  const buttonStyles = twMerge(
    'font-semibold rounded-none',
    'hover:enabled:bg-current/10',
    !withRotatingArrow && 'px-6 py-3',
    className,
  );

  const iconStyles =
    'ml-[-0.75rem] text-white rounded-[100%] p-2 rotate-[135deg] transition-transform duration-300 group-hover:rotate-180 size-10 bg-ocean';

  const ButtonContent = () => (
    <>
      <Button intent='secondary' className={buttonStyles} onClick={onClick}>
        {children}
      </Button>
      {withRotatingArrow && (
        <Icon
          name={iconName}
          className={`${iconStyles} ${iconClasses}`}
          size={iconSize}
        />
      )}
    </>
  );

  if (to) {
    return (
      <div className='group'>
        <Link to={to} className='flex' {...linkProps}>
          <ButtonContent />
        </Link>
      </div>
    );
  }

  return (
    <div className='group'>
      <div className='flex'>
        <ButtonContent />
      </div>
    </div>
  );
};
