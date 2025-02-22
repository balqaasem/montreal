import { twMerge } from 'tailwind-merge';

type DocsButtonProps = {
  className?: string;
};

export const DocsButton = ({ className }: DocsButtonProps) => (
  <a
    href="https://montreal.balqaasem.xyz/docs"
    className={twMerge(
      'inline-flex shrink-0 items-center justify-center rounded-md bg-[#45E6E6] px-4 py-2.5 font-semibold text-sm text-white shadow-sm hover:bg-[#45E6E6]',
      className
    )}
  >
    Read the docs
  </a>
);
