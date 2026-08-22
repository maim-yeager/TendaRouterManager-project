import React from 'react';
import { useRouter } from '../stores/useRouterStore';
import { RefreshCw, Search, Moon, Sun, ShieldCheck, ChevronLeft, Wifi } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    isAuthenticated,
    routerInfo,
    isOffline,
    theme,
    setTheme,
    refreshAll,
    activeSubPage,
    setActiveSubPage,
    globalSearchQuery,
    setGlobalSearchQuery,
  } = useRouter();

  const [showSearch, setShowSearch] = React.useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '12px 16px',
        paddingTop: 'calc(env(safe-area-inset-top, 12px) + 8px)',
        background: 'var(--bg-card)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        {activeSubPage ? (
          <button
            onClick={() => setActiveSubPage(null)}
            className="glass-button"
            style={{ padding: '8px 14px', borderRadius: '20px' }}
            aria-label="Back"
          >
            <ChevronLeft size={18} />
            <span style={{ fontSize: '13px', fontWeight: 700 }}>Back</span>
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--accent-container)',
                border: '1px solid rgba(0, 106, 106, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
              }}
            >
              <Wifi size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h1 style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px', margin: 0 }}>
                  Tenda <span style={{ color: 'var(--accent-cyan)' }}>Manager</span>
                </h1>
                <span className="badge badge-info" style={{ fontSize: '9px', padding: '1px 6px' }}>
                  NH MAIM
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isAuthenticated ? (
                  <>
                    <span>Connected to: {routerInfo?.model || 'Tenda Router'}</span>
                    <span style={{ opacity: 0.4 }}>•</span>
                    <span className={isOffline ? 'badge badge-danger' : 'badge badge-success'} style={{ padding: '1px 6px', fontSize: '9px' }}>
                      {isOffline ? 'Offline' : 'Online'}
                    </span>
                  </>
                ) : (
                  <span>Ready to connect</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isAuthenticated && (
            <>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="glass-button"
                style={{ padding: '8px 10px', borderRadius: '50%', width: '36px', height: '36px' }}
                aria-label="Search"
              >
                <Search size={16} />
              </button>
              <button
                onClick={refreshAll}
                className="glass-button"
                style={{ padding: '8px 10px', borderRadius: '50%', width: '36px', height: '36px' }}
                aria-label="Refresh"
              >
                <RefreshCw size={16} />
              </button>
            </>
          )}

          <button
            onClick={toggleTheme}
            className="glass-button"
            style={{ padding: '8px 10px', borderRadius: '50%', width: '36px', height: '36px' }}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {showSearch && isAuthenticated && (
        <div style={{ marginTop: '10px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search devices, SSIDs, settings, rules..."
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
      )}
    </header>
  );
};
