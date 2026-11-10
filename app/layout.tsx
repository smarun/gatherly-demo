import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gatherly — Agent Engineering Lab',
  description: 'A hands-on workshop for learning harness engineering and loop engineering through an event-planning agent.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
