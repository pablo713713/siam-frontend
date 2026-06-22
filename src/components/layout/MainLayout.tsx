import { useState, type ReactNode, cloneElement, isValidElement } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import css from './MainLayout.module.css';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [quickSearch, setQuickSearch] = useState('');

  const childWithProps =
    typeof children === 'object' && children !== null
      ? cloneWithQuickSearch(children as React.ReactElement, quickSearch, setQuickSearch)
      : children;

  return (
    <div className={css.shell}>
      <Sidebar />
      <div className={css.content}>
        <Topbar onQuickSearch={(q) => setQuickSearch(q)} />
        <main className={css.main}>
          {childWithProps}
        </main>
      </div>
    </div>
  );
}

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
