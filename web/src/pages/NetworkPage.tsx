import React from 'react';
import { useRouter } from '../stores/useRouterStore';
import { Globe, Server, ArrowRight, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

export const NetworkPage: React.FC = () => {
  const { routerInfo, setActiveSubPage } = useRouter();

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Network Status</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          WAN internet connection, gateway routing, and local network configuration
        </p>
      </div>

      {/* WAN Card */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(0, 210, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
              }}
            >
              <Globe size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Internet (WAN)</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {routerInfo?.wanType || 'DHCP (Dynamic IP)'}
              </span>
            </div>
          </div>

          <span
            className={
              routerInfo?.wanStatus === 'connected' ? 'badge badge-success' : 'badge badge-danger'
            }
          >
            {routerInfo?.wanStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>WAN IP Address</span>
            <span className="mono" style={{ fontWeight: 600 }}>{routerInfo?.wanIp || '0.0.0.0'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Connection Mode</span>
            <span style={{ fontWeight: 600 }}>{routerInfo?.wanType || 'DHCP'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span style={{ color: 'var(--text-secondary)' }}>WAN MAC Address</span>
            <span className="mono" style={{ fontWeight: 600 }}>{routerInfo?.macAddress || '00:00:00:00:00:00'}</span>
          </div>
        </div>
      </div>

      {/* LAN Card */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(58, 134, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-blue)',
              }}
            >
              <Server size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Local Network (LAN)</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Subnet and Gateway</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Router Gateway IP</span>
            <span className="mono" style={{ fontWeight: 600 }}>{routerInfo?.lanIp || '192.168.0.1'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Subnet Mask</span>
            <span className="mono" style={{ fontWeight: 600 }}>255.255.255.0</span>
          </div>
        </div>
      </div>

      {/* Sub-links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={() => setActiveSubPage('dhcp')}
          className="glass-panel"
          style={{
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>DHCP Server & Static Leases</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Configure IP pool and reserved addresses</div>
          </div>
          <ArrowRight size={18} color="var(--text-muted)" />
        </button>

        <button
          onClick={() => setActiveSubPage('dns')}
          className="glass-panel"
          style={{
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>DNS Configuration</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Custom DNS servers (Cloudflare, Google, AdGuard)</div>
          </div>
          <ArrowRight size={18} color="var(--text-muted)" />
        </button>

        <button
          onClick={() => setActiveSubPage('port-forwarding')}
          className="glass-panel"
          style={{
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>Port Forwarding & DMZ</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Virtual server and inbound port mapping</div>
          </div>
          <ArrowRight size={18} color="var(--text-muted)" />
        </button>
      </div>
    </div>
  );
};
