const navigationItems = Array.from({ length: 8 });
const metricCards = Array.from({ length: 4 });

export function DashboardShellSkeleton() {
  return (
    <main className="loading-shell" aria-busy="true" aria-label="Loading workspace">
      <aside className="loading-sidebar" aria-hidden="true">
        <div className="loading-brand"><span className="skeleton-block" /><span className="skeleton-line wide" /></div>
        <div className="loading-navigation">
          {navigationItems.map((_, index) => <span className="skeleton-nav" key={index} />)}
        </div>
        <div className="skeleton-workspace" />
      </aside>
      <section className="loading-stage">
        <header className="loading-topbar">
          <span className="skeleton-search" />
          <span className="skeleton-actions" />
        </header>
        <section className="loading-content" aria-hidden="true">
          <div className="skeleton-heading"><span className="skeleton-icon" /><span><i className="skeleton-line title" /><i className="skeleton-line subtitle" /></span></div>
          <div className="skeleton-metrics">
            {metricCards.map((_, index) => <span className="skeleton-metric" key={index}><i className="skeleton-icon" /><b><i className="skeleton-line label" /><i className="skeleton-line count" /><i className="skeleton-line caption" /></b></span>)}
          </div>
          <div className="skeleton-panels"><span className="skeleton-panel" /><span className="skeleton-panel" /></div>
        </section>
      </section>
    </main>
  );
}
