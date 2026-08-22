import React from 'react';
import { useRouter } from '../stores/useRouterStore';
import {
  ShieldCheck,
  Server,
  Globe,
  Sliders,
  Zap,
  Network,
  Layers,
  RotateCw,
  FileText,
  Bookmark,
  Settings,
  ChevronRight,
  LogOut,
} from 'lucide-react';

export const MorePage: React.FC = () => {
  const { setActiveSubPage, logout, capabilities } = useRouter();

  const menuSections = [
    {
      title: 'Wireless & Access',
      items: [
        {
          id: 'guest-wifi',
          title: 'Guest Network',
          subtitle: 'Isolated guest SSID and time limits',
          icon: ShieldCheck,
          color: 'var(--accent-purple)',
          supported: capabilities?.guestNetwork,
        },
        {
          id: 'parental-control',
          title: 'Parental Controls',
          subtitle: 'Bedtime curfews and access schedules',
          icon: Zap,
          color: 'var(--accent-amber)',
          supported: capabilities?.parentalControl,
        },
        {
          id: 'mesh',
          title: 'Nova Mesh System',
          subtitle: 'Whole-home node topology and backhaul',
          icon: Layers,
          color: 'var(--accent-blue)',
          supported: capabilities?.mesh,
        },
      ],
    },
    {
      title: 'Network & Routing',
      items: [
        {
          id: 'dhcp',
          title: 'DHCP & Static IP',
          subtitle: 'IP address pool and MAC address binding',
          icon: Server,
          color: 'var(--accent-cyan)',
          supported: capabilities?.dhcp,
        },
        {
          id: 'dns',
          title: 'DNS Servers',
          subtitle: 'Custom DNS resolution providers',
          icon: Globe,
          color: 'var(--accent-green)',
          supported: capabilities?.dns,
        },
        {
          id: 'qos',
          title: 'QoS Bandwidth',
          subtitle: 'Traffic shaping and speed limits',
          icon: Sliders,
          color: 'var(--accent-purple)',
          supported: capabilities?.qos,
        },
        {
          id: 'port-forwarding',
          title: 'Port Forwarding',
          subtitle: 'Virtual servers and DMZ configuration',
          icon: Network,
          color: 'var(--accent-cyan)',
          supported: capabilities?.portForwarding,
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        {
          id: 'system',
          title: 'System & Reboot',
          subtitle: 'Firmware info and hardware power',
          icon: RotateCw,
          color: '#ef4444',
          supported: true,
        },
        {
          id: 'logs',
          title: 'System Logs',
          subtitle: 'Security, DHCP, and WAN audit trails',
          icon: FileText,
          color: 'var(--accent-blue)',
          supported: capabilities?.logs,
        },
        {
          id: 'profiles',
          title: 'Router Profiles',
          subtitle: 'Manage multiple saved routers',
          icon: Bookmark,
          color: 'var(--accent-amber)',
          supported: true,
        },
        {
          id: 'settings',
          title: 'App Settings & Credits',
          subtitle: 'Security, themes, credit NH MAIM',
          icon: Settings,
          color: 'var(--text-secondary)',
          supported: true,
        },
      ],
    },
  ];

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Tools & Features</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Comprehensive management suite for Tenda routers
        </p>
      </div>

      {menuSections.map((sec) => (
        <div key={sec.title}>
          <h3
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: 'var(--text-muted)',
              marginBottom: '10px',
              paddingLeft: '4px',
            }}
          >
            {sec.title}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sec.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSubPage(item.id)}
                  className="glass-panel"
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: 'var(--bg-card)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: item.color,
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{item.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {item.supported === false && (
                      <span className="badge badge-warning" style={{ fontSize: '10px' }}>
                        N/A
                      </span>
                    )}
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        onClick={logout}
        className="glass-panel"
        style={{
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
          cursor: 'pointer',
          color: '#ef4444',
          marginTop: '8px',
        }}
      >
        <LogOut size={20} />
        <span style={{ fontWeight: 700, fontSize: '14px' }}>Log Out of Router</span>
      </button>
    </div>
  );
};
