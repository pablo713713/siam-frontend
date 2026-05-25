import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [quickSearch, setQuickSearch] = useState('');

  const childWithProps = typeof children === 'object' && children !== null
    ? cloneWithQuickSearch(children as React.ReactElement, quickSearch, setQuickSearch)
    : children;

  return (
    <div style={{
      display: 'flex', height: '100vh',
      fontFamily: "'Barlow', 'Helvetica Neue', Arial, sans-serif",
      background: '#F6F6F6', overflow: 'hidden',
    }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar onQuickSearch={(q) => setQuickSearch(q)} />

        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {childWithProps}
        </main>
      </div>
    </div>
  );
}

import { cloneElement, isValidElement } from 'react';

function cloneWithQuickSearch(
  child: React.ReactElement,
  quickSearch: string,
  setQuickSearch: (q: string) => void,
): React.ReactElement {
  if (!isValidElement(child)) return child;
  return cloneElement(child as React.ReactElement<Record<string, unknown>>, {
    quickSearch,
    setQuickSearch,
  });
}
