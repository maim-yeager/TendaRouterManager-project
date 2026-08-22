import React, { useState, useEffect } from 'react';
import { useRouter } from '../stores/useRouterStore';
import { CapabilityGuard } from '../components/CapabilityGuard';
import { Shield, Plus, Trash2, Check, Clock, Globe } from 'lucide-react';
import { ParentalControlRule } from '../types/router';

export const ParentalControlPage: React.FC = () => {
  const { parentalRules, saveParentalRule, deleteParentalRule, capabilities, devices } = useRouter();

  const [showAddModal, setShowAddModal] = useState(false);
  const [targetMac, setTargetMac] = useState('');
  const [targetName, setTargetName] = useState('');
  const [startTime, setStartTime] = useState('21:00');
  const [endTime, setEndTime] = useState('07:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (devices.length > 0 && !targetMac) {
      setTargetMac(devices[0].macAddress);
      setTargetName(devices[0].name);
    }
  }, [devices]);

  const handleToggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleAddRule = async () => {
    if (!targetMac) return;
    setIsSaving(true);
    const rule: ParentalControlRule = {
      id: 'rule_' + Date.now(),
      profileName: targetName || 'Device Profile',
      targetMacAddresses: [targetMac],
      enabled: true,
      timeRules: [
        {
          days: selectedDays,
          startTime,
          endTime,
        },
      ],
      isInternetPaused: false,
      blockedWebsites: [],
    };
    await saveParentalRule(rule);
    setIsSaving(false);
    setShowAddModal(false);
  };

  const handleDelete = async (ruleId: string) => {
    if (!window.confirm('Delete this parental schedule?')) return;
    await deleteParentalRule(ruleId);
  };

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <CapabilityGuard isSupported={capabilities?.parentalControl} featureName="Parental Controls">
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Parental Controls</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Set bedtime internet curfews and access schedules for children devices
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="glass-button"
            style={{ padding: '8px 12px', fontSize: '12px' }}
          >
            <Plus size={14} />
            <span>Add Rule</span>
          </button>
        </div>

        {parentalRules.length === 0 ? (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No parental control rules configured. Click "Add Rule" to set a schedule.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {parentalRules.map((rule) => (
              <div key={rule.id} className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{rule.profileName}</h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      <span className="mono">{rule.targetMacAddresses.join(', ')}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Clock size={14} color="var(--accent-amber)" />
                  <span>
                    Schedule: {rule.timeRules[0]?.startTime || '21:00'} – {rule.timeRules[0]?.endTime || '07:00'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              background: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>New Parental Rule</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Select Device
                  </label>
                  <select
                    className="input-field"
                    value={targetMac}
                    onChange={(e) => {
                      setTargetMac(e.target.value);
                      const d = devices.find((dev) => dev.macAddress === e.target.value);
                      if (d) setTargetName(d.name);
                    }}
                  >
                    {devices.map((d) => (
                      <option key={d.macAddress} value={d.macAddress}>
                        {d.name} ({d.ipAddress})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Start Time
                    </label>
                    <input
                      type="time"
                      className="input-field"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      End Time
                    </label>
                    <input
                      type="time"
                      className="input-field"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Active Days
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {dayNames.map((name, idx) => {
                      const dayNum = idx + 1;
                      const active = selectedDays.includes(dayNum);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleToggleDay(dayNum)}
                          style={{
                            flex: 1,
                            padding: '6px 0',
                            borderRadius: '8px',
                            background: active ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                            color: active ? '#fff' : 'var(--text-secondary)',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAddModal(false)} className="glass-button" style={{ padding: '8px 16px' }}>
                  Cancel
                </button>
                <button onClick={handleAddRule} disabled={isSaving} className="primary-button" style={{ padding: '8px 16px' }}>
                  {isSaving ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CapabilityGuard>
  );
};
