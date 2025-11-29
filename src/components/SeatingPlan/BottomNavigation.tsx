import React from 'react';

type MobilePanel = 'guests' | 'plan' | 'summary';

interface BottomNavigationProps {
  activePanel: MobilePanel;
  onPanelChange: (panel: MobilePanel) => void;
}

export function BottomNavigation({ activePanel, onPanelChange }: BottomNavigationProps) {
  const handleKeyDown = (e: React.KeyboardEvent, panel: MobilePanel) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPanelChange(panel);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const panels: MobilePanel[] = ['guests', 'plan', 'summary'];
      const currentIndex = panels.indexOf(activePanel);
      const newIndex = currentIndex > 0 ? currentIndex - 1 : panels.length - 1;
      onPanelChange(panels[newIndex]);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const panels: MobilePanel[] = ['guests', 'plan', 'summary'];
      const currentIndex = panels.indexOf(activePanel);
      const newIndex = currentIndex < panels.length - 1 ? currentIndex + 1 : 0;
      onPanelChange(panels[newIndex]);
    }
  };

  const navItems: Array<{ id: MobilePanel; label: string; icon: JSX.Element }> = [
    {
      id: 'guests',
      label: 'Guests',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      id: 'plan',
      label: 'Plan',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      )
    },
    {
      id: 'summary',
      label: 'Summary',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border/40 shadow-[var(--shadow-lg)] z-40"
      role="navigation"
      aria-label="Seating plan navigation"
    >
      <div className="grid grid-cols-3 h-16">
        {navItems.map((item) => {
          const isActive = activePanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPanelChange(item.id)}
              onKeyDown={(e) => handleKeyDown(e, item.id)}
              className={`
                flex flex-col items-center justify-center gap-1 transition-all duration-150
                focus:outline-none focus-visible:ring-4 focus-visible:ring-ring
                active:scale-95
                ${isActive
                  ? 'bg-primary/10 text-primary border-t-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`${item.label} panel${isActive ? ' (current)' : ''}`}
              role="tab"
              aria-selected={isActive}
            >
              <span className={isActive ? 'scale-110' : ''}>
                {item.icon}
              </span>
              <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
