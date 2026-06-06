import React from 'react';
import { Activity, ListMusic, Download, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

const NavItem = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 transition-all relative",
      active
        ? 'text-white'
        : 'text-white/40 hover:text-white/70'
    )}
  >
    {active && (
      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
    )}
    {icon}
    <span className="text-[10px] font-semibold tracking-tight">{label}</span>
  </button>
);

const BottomNav = ({ activeTab, setActiveTab }) => {
  return (
    <nav
      className="flex items-center border-t shrink-0 safe-area-bottom"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--border-color)',
        height: '60px',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <NavItem
        icon={<Activity size={22} />}
        label="Ana Sayfa"
        active={activeTab === 'home'}
        onClick={() => setActiveTab('home')}
      />
      <NavItem
        icon={<ListMusic size={22} />}
        label="Kütüphane"
        active={activeTab === 'library'}
        onClick={() => setActiveTab('library')}
      />
      <NavItem
        icon={<Download size={22} />}
        label="İndir"
        active={activeTab === 'search'}
        onClick={() => setActiveTab('search')}
      />
      <NavItem
        icon={<Settings size={22} />}
        label="Ayarlar"
        active={activeTab === 'settings'}
        onClick={() => setActiveTab('settings')}
      />
    </nav>
  );
};

export default BottomNav;
