import React, { useState, useEffect } from 'react';
import { useRouter } from '../stores/useRouterStore';
import { CapabilityGuard } from '../components/CapabilityGuard';
import { FileText, RefreshCw, Search, Filter } from 'lucide-react';

export const LogsPage: React.FC = () => {
  const { logs, refreshLogs, capabilities } = useRouter();
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshLogs();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshLogs();
    setIsRefreshing(false);
  };

  const filteredLogs = logs.filter((log) => {
    const matchType = filterType === 'ALL' || log.category.toUpperCase() === filterType;
    const matchSearch =
      !search ||
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.category.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <CapabilityGuard isSupported={capabilities?.logs} featureName="System Logs">
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>System Logs</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Inspect router security audits, DHCP leases, and WAN disconnections
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="glass-button"
            style={{ padding: '8px 12px', fontSize: '12px' }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['ALL', 'SECURITY', 'DHCP', 'WAN', 'SYSTEM'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: filterType === type ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                color: filterType === type ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '38px' }}
            placeholder="Search log messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Logs List */}
        {filteredLogs.length === 0 ? (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No log entries available on router.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="glass-panel"
                style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    className={
                      log.level === 'ERROR'
                        ? 'badge badge-danger'
                        : log.level === 'WARN'
                        ? 'badge badge-warning'
                        : 'badge badge-info'
                    }
                  >
                    {log.category} • {log.level}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.timestamp}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px' }}>
                  {log.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CapabilityGuard>
  );
};
