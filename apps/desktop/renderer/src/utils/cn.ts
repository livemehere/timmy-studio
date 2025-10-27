import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

export const cn = (...inputs: any[]) => {
  return twMerge(clsx(inputs));
};
