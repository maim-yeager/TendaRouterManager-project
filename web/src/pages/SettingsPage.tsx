import React from 'react';
import { useRouter } from '../stores/useRouterStore';
import { Shield, Key, Moon, Sun, Smartphone, Code, Heart, LogOut } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme, logout } = useRouter();

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>App Settings</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Security, preferences, and developer information
        </p>
      </div>

      {/* Theme Card */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Appearance</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            onClick={() => setTheme('dark')}
            className="glass-button"
            style={{
              borderColor: theme === 'dark' ? 'var(--accent-cyan)' : 'var(--border-color)',
              background: theme === 'dark' ? 'rgba(0, 210, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              color: theme === 'dark' ? 'var(--accent-cyan)' : 'var(--text-primary)',
            }}
          >
            <Moon size={16} />
            <span>Dark Cyber</span>
          </button>

          <button
            onClick={() => setTheme('light')}
            className="glass-button"
            style={{
              borderColor: theme === 'light' ? 'var(--accent-cyan)' : 'var(--border-color)',
              background: theme === 'light' ? 'rgba(0, 210, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              color: theme === 'light' ? 'var(--accent-cyan)' : 'var(--text-primary)',
            }}
          >
            <Sun size={16} />
            <span>Clean Light</span>
          </button>
        </div>
      </div>

      {/* Security Architecture Info */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <Shield size={20} color="var(--accent-green)" />
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Security & Hardware Keystore</h3>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Router administration passwords are cryptographically sealed in the <strong>Android Hardware Keystore (AES-256 GCM)</strong>. No credentials or passwords are ever exposed in plaintext Web storage or sent to external servers.
        </p>
      </div>

      {/* Developer Credits */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Code size={20} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Developer & Application Credit</h3>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '8px' }}>
          <strong>Developer:</strong> NH MAIM
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          App: Tenda Router Manager Native Edition (v1.0.0)
        </div>
      </div>

      {/* Session Controls */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <button
          onClick={logout}
          className="danger-button"
          style={{ width: '100%', fontSize: '14px' }}
        >
          <LogOut size={16} />
          <span>Disconnect & Logout</span>
        </button>
      </div>
    </div>
  );
};
