import React from 'react';

interface GadgetLabLayoutProps {
  title: string;
  subtitle?: string;
  hero?: React.ReactNode;
  actions?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

const GadgetLabLayout: React.FC<GadgetLabLayoutProps> = ({
  title,
  subtitle,
  hero,
  actions,
  sidebar,
  children,
}) => (
  <div className="gadget-lab-shell">
    <header className="lab-header">
      <div>
        {subtitle ? <p className="lab-header__subtitle">{subtitle}</p> : null}
        <h1 className="lab-header__title">{title}</h1>
      </div>
      {actions ? <div className="lab-header__actions">{actions}</div> : null}
    </header>
    {hero ? (
      <section className="lab-hero" aria-label="Mission-critical gadgets">
        {hero}
      </section>
    ) : null}
    <div className="lab-content">
      <main className="lab-main" role="main">
        {children}
      </main>
      {sidebar ? (
        <aside className="lab-sidebar" aria-label="Insight sidebar">
          {sidebar}
        </aside>
      ) : null}
    </div>
  </div>
);

export default React.memo(GadgetLabLayout);
