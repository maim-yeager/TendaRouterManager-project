import React from 'react';
import { useRouter } from '../stores/useRouterStore';
import { Home, Laptop, Wifi, Globe, MoreHorizontal } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, setActiveSubPage, devices } = useRouter();

  const handleTabClick = (tab: 'home' | 'devices' | 'wifi' | 'network' | 'more') => {
    setActiveSubPage(null);
    setActiveTab(tab);
  };

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    {
      id: 'devices' as const,
      label: 'Devices',
      icon: Laptop,
      badge: devices.length > 0 ? devices.length : undefined,
    },
    { id: 'wifi' as const, label: 'Wi-Fi', icon: Wifi },
    { id: 'network' as const, label: 'Network', icon: Globe },
    { id: 'more' as const, label: 'More', icon: MoreHorizontal },
  ];

  return (
    <nav
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 50,
        padding: '6px 12px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 6px)',
        background: 'var(--bg-secondary)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            style={{
              background: 'transparent',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px 8px',
              position: 'relative',
              transition: 'all 0.2s ease',
            }}
          >
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 16px',
                borderRadius: '16px',
                background: isActive ? 'var(--accent-container)' : 'transparent',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                transition: 'all 0.2s ease',
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
              {item.badge !== undefined && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '4px',
                    background: 'var(--accent-teal)',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '10px',
                    padding: '1px 5px',
                    minWidth: '16px',
                    textAlign: 'center',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '-0.2px',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
