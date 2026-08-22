import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface CapabilityGuardProps {
  isSupported: boolean | undefined;
  featureName: string;
  children: React.ReactNode;
}

export const CapabilityGuard: React.FC<CapabilityGuardProps> = ({
  isSupported,
  featureName,
  children,
}) => {
  if (isSupported === false) {
    return (
      <div
        className="glass-panel"
        style={{
          padding: '24px 20px',
          textAlign: 'center',
          margin: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-amber)',
          }}
        >
          <AlertTriangle size={24} />
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{featureName} Unavailable</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '340px', lineHeight: 1.5 }}>
          This feature is not supported by this router model or firmware.
        </p>
        <div
          style={{
            marginTop: '8px',
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Info size={14} />
          <span>Real Tenda hardware capability detection active</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
