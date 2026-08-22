import React, { useState } from 'react';
import { useRouter } from '../stores/useRouterStore';
import { Server, Plus, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';
import { RouterProfile } from '../types/router';

export const ProfilesPage: React.FC = () => {
  const { profiles, activeProfile, saveProfile, deleteProfile, login } = useRouter();

  const [showAddModal, setShowAddModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileAddress, setProfileAddress] = useState('192.168.0.1');
  const [profileUser, setProfileUser] = useState('admin');

  const handleAdd = async () => {
    if (!profileName || !profileAddress) return;
    const newProfile: RouterProfile = {
      id: 'prof_' + Date.now(),
      name: profileName,
      address: profileAddress,
      username: profileUser || 'admin',
    };
    await saveProfile(newProfile);
    setShowAddModal(false);
    setProfileName('');
  };

  const handleDelete = async (id: string) => {
    if (profiles.length <= 1) {
      alert('You must keep at least one profile.');
      return;
    }
    if (!window.confirm('Delete this router profile?')) return;
    await deleteProfile(id);
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Router Profiles</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Switch seamlessly between Home, Office, or Shop routers
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="glass-button"
          style={{ padding: '8px 12px', fontSize: '12px' }}
        >
          <Plus size={14} />
          <span>Add Profile</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {profiles.map((p) => {
          const isActive = activeProfile?.id === p.id;
          return (
            <div
              key={p.id}
              className="glass-panel"
              style={{
                padding: '16px',
                borderLeft: isActive ? '4px solid var(--accent-cyan)' : '4px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'rgba(0, 210, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-cyan)',
                    }}
                  >
                    <Server size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{p.name}</h3>
                      {isActive && <span className="badge badge-success">Active</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {p.address} • User: {p.username || 'admin'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '380px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Add Router Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Profile Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. Office Router, Upstairs Nova"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  IP Address or Host
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={profileAddress}
                  onChange={(e) => setProfileAddress(e.target.value)}
                  placeholder="192.168.0.1"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Admin Username
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={profileUser}
                  onChange={(e) => setProfileUser(e.target.value)}
                  placeholder="admin"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddModal(false)} className="glass-button" style={{ padding: '8px 16px' }}>
                Cancel
              </button>
              <button onClick={handleAdd} className="primary-button" style={{ padding: '8px 16px' }}>
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
