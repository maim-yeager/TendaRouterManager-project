import React, { useState, useEffect } from 'react';
import { useRouter } from '../stores/useRouterStore';
import { CapabilityGuard } from '../components/CapabilityGuard';
import { ShieldCheck, Lock, Clock, Sliders, Check } from 'lucide-react';
import { GuestWifiSettings } from '../types/router';

export const GuestWifiPage: React.FC = () => {
  const { guestWifiSettings, saveGuestWifiSettings, capabilities } = useRouter();

  const [form, setForm] = useState<GuestWifiSettings>({
    enabled: false,
    ssid: 'Tenda_Guest',
    security: 'WPA2-PSK',
    password: '',
    durationHours: 8,
    downloadLimitKbps: 0,
    uploadLimitKbps: 0,
    allowLocalAccess: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (guestWifiSettings) {
      setForm(guestWifiSettings);
    }
  }, [guestWifiSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const ok = await saveGuestWifiSettings(form);
    setIsSaving(false);
    if (ok) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <CapabilityGuard isSupported={capabilities?.guestNetwork} featureName="Guest Wi-Fi">
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Guest Wi-Fi Network</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Provide isolated wireless access for visitors without revealing your main password
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
            <span>Guest network settings saved!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>Enable Guest Network</span>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Turn guest radio on or off</div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Guest Network Name (SSID)
            </label>
            <input
              type="text"
              className="input-field"
              value={form.ssid}
              onChange={(e) => setForm({ ...form, ssid: e.target.value })}
              placeholder="Tenda_Guest"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Guest Password
            </label>
            <input
              type="text"
              className="input-field"
              value={form.password || ''}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Leave empty for open guest network"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Valid Duration (Hours)
              </label>
              <select
                className="input-field"
                value={form.durationHours}
                onChange={(e) => setForm({ ...form, durationHours: parseInt(e.target.value, 10) })}
              >
                <option value={4}>4 Hours</option>
                <option value={8}>8 Hours</option>
                <option value={24}>24 Hours</option>
                <option value={0}>Always Active</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Speed Cap (KB/s)
              </label>
              <input
                type="number"
                className="input-field"
                value={form.downloadLimitKbps || ''}
                onChange={(e) => setForm({ ...form, downloadLimitKbps: parseInt(e.target.value, 10) || 0 })}
                placeholder="0 = Unlimited"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Allow Local LAN Access</span>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Allows guests to see other local network devices</div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={form.allowLocalAccess}
                onChange={(e) => setForm({ ...form, allowLocalAccess: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="primary-button"
            style={{ width: '100%', marginTop: '8px' }}
          >
            {isSaving ? 'Saving...' : 'Save Guest Settings'}
          </button>
        </form>
      </div>
    </CapabilityGuard>
  );
};
