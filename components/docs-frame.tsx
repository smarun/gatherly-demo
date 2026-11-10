import Link from 'next/link';
import type { ReactNode } from 'react';

export default function DocsFrame({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="docs-shell">
      <header className="docs-topbar">
        <Link href="/" className="docs-brand"><span className="docs-brand-mark">✦</span><span>gatherly <small>AGENT ENGINEERING LAB</small></span></Link>
        <nav><Link href="/">Live workshop</Link><Link href="/architecture">Architecture</Link><Link href="/maintenance">Maintenance guide</Link></nav>
      </header>
      <article className="docs-content">
        <div className="docs-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p className="docs-intro">{intro}</p>
        {children}
        <div className="docs-back"><Link href="/">← Back to the live workshop</Link></div>
      </article>
    </main>
  );
}
