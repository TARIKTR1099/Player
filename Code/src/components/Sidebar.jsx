import React, { useEffect } from 'react';
import { Activity, ListMusic, Download, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { t } from '../i18n';
import appIcon from '../assets/icon.png';

const NavItem = ({ icon, label, active, onClick, sidebarMode }) => (
  <div onClick={onClick} className={cn("flex items-center p-3 rounded-xl cursor-pointer transition-all text-sm font-bold tracking-tight", sidebarMode === 'icons' ? 'justify-center' : 'justify-start gap-3', active ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-white/5')}>
    {icon} {label && <span>{label}</span>}
  </div>
);

const Sidebar = ({ sidebarMode, setSidebarMode, activeTab, setActiveTab, sidebarWidth, setSidebarWidth, isResizingSidebar, setIsResizingSidebar, sidebarResizeRef }) => {
  useEffect(() => {
    if (!isResizingSidebar) return;
    const handleMouseMove = (e) => {
      const newWidth = Math.max(180, Math.min(400, e.clientX));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizingSidebar(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar, setSidebarWidth]);

  return (
    <div className={`flex flex-col border-r flex-shrink-0 relative transition-all duration-200 overflow-hidden ${sidebarMode === 'collapsed' ? 'w-0 border-r-0' : ''}`} style={sidebarMode === 'collapsed' ? {} : {width: sidebarMode === 'icons' ? 64 : sidebarWidth, backgroundColor:'var(--color-bg-secondary)', borderColor:'var(--border-color)'}}>
      {sidebarMode !== 'collapsed' && (<>
       <div className={cn("flex items-center whitespace-nowrap", sidebarMode === 'icons' ? 'p-4 justify-center' : 'p-6 gap-3')} style={{color:'var(--color-primary)'}}>
         {sidebarMode === 'icons' ? (
           <img src={appIcon} className="w-7 h-7 rounded-lg" />
         ) : (
           <>
             <img src={appIcon} className="w-9 h-9 rounded-xl" />
             <span className="font-black tracking-tighter text-2xl">PLAYER</span>
           </>
         )}
       </div>
      <nav className={cn("flex-1 gap-1", sidebarMode === 'icons' ? 'px-2' : 'px-4')}>
        <NavItem active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Activity size={sidebarMode === 'icons' ? 24 : 20} />} label={sidebarMode === 'icons' ? '' : 'Ana Sayfa'} sidebarMode={sidebarMode} />
        <NavItem active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={<ListMusic size={sidebarMode === 'icons' ? 24 : 20} />} label={sidebarMode === 'icons' ? '' : 'Kütüphane'} sidebarMode={sidebarMode} />
        <NavItem active={activeTab === 'search'} onClick={() => setActiveTab('search')} icon={<Download size={sidebarMode === 'icons' ? 24 : 20} />} label={sidebarMode === 'icons' ? '' : t('nav.download')} sidebarMode={sidebarMode} />
      </nav>
      <div className={cn("border-t whitespace-nowrap", sidebarMode === 'icons' ? 'px-2' : 'p-4')} style={{borderColor:'var(--border-color)'}}>
        <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={sidebarMode === 'icons' ? 24 : 20} />} label={sidebarMode === 'icons' ? '' : 'Ayarlar'} sidebarMode={sidebarMode} />
      </div>
      {sidebarMode === 'full' && (
        <div ref={sidebarResizeRef} className="absolute right-0 top-0 w-2 h-full cursor-col-resize z-10 flex items-center justify-center group" onMouseDown={() => setIsResizingSidebar(true)}>
          <div className="w-0.5 h-12 rounded-full transition-all group-hover:w-1" style={{backgroundColor:'var(--color-primary)', opacity:0.4}} />
        </div>
      )}
      </>)}
    </div>
  );
};

export default Sidebar;
