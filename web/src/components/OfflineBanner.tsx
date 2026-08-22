import React from 'react';
import { useRouter } from '../stores/useRouterStore';
import { WifiOff, RefreshCw, Clock } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const { isOffline, offlineReason, lastUpdated, refreshAll } = useRouter();

  if (!isOffline) return null;

  return (
    <div
      style={{
        margin: '12px 16px',
        padding: '16px',
        borderRadius: '16px',
        background: 'rgba(239, 68, 68, 0.12)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
          }}
        >
          <WifiOff size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#ef4444' }}>
            Router Offline
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {offlineReason || 'The router could not be reached.'}
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          background: 'rgba(0, 0, 0, 0.15)',
          padding: '8px 12px',
          borderRadius: '8px',
          lineHeight: 1.6,
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: '2px' }}>Please check:</p>
        <ul style={{ paddingLeft: '18px', margin: 0 }}>
          <li>Wi-Fi connection to your Tenda router</li>
          <li>Router power and cable connectivity</li>
          <li>Management IP address (e.g. 192.168.0.1)</li>
        </ul>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
        {lastUpdated && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <Clock size={13} />
            <span>Last updated: {lastUpdated}</span>
          </div>
        )}
        <button
          onClick={refreshAll}
          className="glass-button"
          style={{ padding: '6px 14px', fontSize: '12px', borderColor: 'rgba(239, 68, 68, 0.4)' }}
        >
          <RefreshCw size={13} />
          <span>Retry Connection</span>
        </button>
      </div>
    </div>
  );
};
