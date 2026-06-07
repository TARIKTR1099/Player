import React, { useState, useEffect } from 'react';
import { Menu, Minus, Square, Copy, X, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { isElectron, isMacOS } from '../platform';

function TitleBar({ sidebarMode, setSidebarMode, sidebarToggleBehavior, isMobileViewport, showMobileSidebar, setShowMobileSidebar }) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (isElectron()) {
      const ipcRenderer = window.require('electron').ipcRenderer;
      ipcRenderer.invoke('is-window-maximized').then(setIsMaximized).catch(() => {});

      const handleMax = (event, val) => setIsMaximized(val);
      ipcRenderer.on('window-maximized-event', handleMax);

      return () => {
        ipcRenderer.removeListener('window-maximized-event', handleMax);
      };
    }
  }, []);

  return (
    <div className={cn("h-10 flex justify-between items-center px-4 select-none", isMacOS() && 'pl-20')} style={{backgroundColor:'var(--color-bg-tertiary)', WebkitAppRegion:'drag'}}>
      <div className="flex items-center gap-4 text-muted-foreground">
        <Menu size={18} className="cursor-pointer hover:text-primary transition" style={{WebkitAppRegion:'no-drag'}} onClick={() => {
          if (isMobileViewport) {
            setShowMobileSidebar(!showMobileSidebar);
          } else if (sidebarToggleBehavior === 'fullToggle') {
            setSidebarMode(sidebarMode === 'collapsed' ? 'full' : 'collapsed');
          } else {
            setSidebarMode(sidebarMode === 'icons' ? 'full' : 'icons');
          }
        }} />
        <div className="text-[10px] font-bold tracking-widest uppercase opacity-40">
          <span>Player</span>
        </div>
      </div>
      {isElectron() && !isMacOS() && (
        <div className="flex items-center gap-1 h-full pr-1" style={{WebkitAppRegion:'no-drag'}}>
          <button
            onClick={() => window.require('electron').ipcRenderer.invoke('window-minimize')}
            className="hover:bg-white/15 text-white/70 hover:text-white w-10 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95"
            title="Simge Durumuna Küçült"
          >
            <Minus size={16} />
          </button>
          <button
            onClick={() => window.require('electron').ipcRenderer.invoke('window-close-to-tray')}
            className="hover:bg-white/15 text-white/70 hover:text-white w-10 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95"
            title="Tepsiye Gizle (arka planda çalmaya devam eder)"
          >
            <EyeOff size={15} />
          </button>
          <button
            onClick={() => window.require('electron').ipcRenderer.invoke('window-maximize')}
            className="hover:bg-white/15 text-white/70 hover:text-white w-10 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95"
            title={isMaximized ? "Aşağı Geri Getir" : "Tam Ekran Yap / Ekranı Kapla"}
          >
            {isMaximized ? <Copy size={13} style={{ transform: 'rotate(180deg)' }} /> : <Square size={13} />}
          </button>
          <button
            onClick={() => window.require('electron').ipcRenderer.invoke('window-close')}
            className="hover:bg-red-500/30 text-white/70 hover:text-red-300 w-10 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95 group"
            title="Kapat"
          >
            <X size={16} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      )}
      {isElectron() && isMacOS() && (
        <div className="flex h-full" style={{WebkitAppRegion:'no-drag'}} />
      )}
    </div>
  );
}

export default TitleBar;
