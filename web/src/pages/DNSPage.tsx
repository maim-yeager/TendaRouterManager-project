import React, { useState, useEffect } from 'react';
import { useRouter } from '../stores/useRouterStore';
import { CapabilityGuard } from '../components/CapabilityGuard';
import { Globe, Check, Shield } from 'lucide-react';
import { DNSSettings } from '../types/router';

export const DNSPage: React.FC = () => {
  const { dnsSettings, saveDNSSettings, capabilities } = useRouter();

  const [form, setForm] = useState<DNSSettings>({
    mode: 'auto',
    primaryDns: '',
    secondaryDns: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (dnsSettings) {
      setForm(dnsSettings);
    }
  }, [dnsSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const ok = await saveDNSSettings(form);
    setIsSaving(false);
    if (ok) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const applyPreset = (primary: string, secondary: string) => {
    setForm({
      mode: 'manual',
      primaryDns: primary,
      secondaryDns: secondary,
    });
  };

  return (
    <CapabilityGuard isSupported={capabilities?.dns} featureName="DNS Configuration">
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>DNS Settings</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Configure Domain Name Resolution servers for higher speed and privacy
          </p>
        </div>

        {savedSuccess && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Check size={16} />
            <span>DNS settings applied successfully!</span>
          </div>
        )}

        {/* Presets */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>Fast DNS Providers</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => applyPreset('1.1.1.1', '1.0.0.1')}
              className="glass-button"
              style={{ padding: '8px', fontSize: '11px', textAlign: 'left', justifyContent: 'flex-start' }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>Cloudflare</div>
                <div style={{ color: 'var(--text-muted)' }}>1.1.1.1 / 1.0.0.1</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('8.8.8.8', '8.8.4.4')}
              className="glass-button"
              style={{ padding: '8px', fontSize: '11px', textAlign: 'left', justifyContent: 'flex-start' }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>Google Public</div>
                <div style={{ color: 'var(--text-muted)' }}>8.8.8.8 / 8.8.4.4</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('9.9.9.9', '149.112.112.112')}
              className="glass-button"
              style={{ padding: '8px', fontSize: '11px', textAlign: 'left', justifyContent: 'flex-start' }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>Quad9 (Secure)</div>
                <div style={{ color: 'var(--text-muted)' }}>9.9.9.9 / 149.112...</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('94.140.14.14', '94.140.15.15')}
              className="glass-button"
              style={{ padding: '8px', fontSize: '11px', textAlign: 'left', justifyContent: 'flex-start' }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>AdGuard (AdBlock)</div>
                <div style={{ color: 'var(--text-muted)' }}>94.140.14.14</div>
              </div>
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              DNS Mode
            </label>
            <select
              className="input-field"
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value as any })}
            >
              <option value="auto">Automatic (From ISP)</option>
              <option value="manual">Manual (Custom DNS)</option>
            </select>
          </div>

          {form.mode === 'manual' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Primary DNS Server
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={form.primaryDns}
                  onChange={(e) => setForm({ ...form, primaryDns: e.target.value })}
                  placeholder="e.g. 1.1.1.1"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Secondary DNS Server
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={form.secondaryDns}
                  onChange={(e) => setForm({ ...form, secondaryDns: e.target.value })}
                  placeholder="e.g. 1.0.0.1"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="primary-button"
            style={{ width: '100%', marginTop: '4px' }}
          >
            {isSaving ? 'Applying...' : 'Apply DNS Settings'}
          </button>
        </form>
      </div>
    </CapabilityGuard>
  );
};
