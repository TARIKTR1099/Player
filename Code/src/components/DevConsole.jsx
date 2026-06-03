import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../store';
import { Terminal, X, Copy, Trash2, ChevronDown, ChevronUp, FolderOpen } from 'lucide-react';

const LOG_COLORS = {
  info: 'var(--color-primary)',
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#ef4444',
};

const DevConsole = () => {
  const { logs, clearLogs } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logFilePath, setLogFilePath] = useState('');
  const scrollRef = useRef(null);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (scrollRef.current && !collapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, collapsed]);

  // Get log file path on mount
  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('get-log-path').then(path => setLogFilePath(path)).catch(() => {});
    } catch (e) {
      console.warn('Electron API not available:', e.message);
    }
  }, []);

  const handleCopy = () => {
    const text = logs
      .map((log) => `[${new Date(log.timestamp).toLocaleTimeString('tr-TR')}] [${log.type.toUpperCase()}] ${log.text}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenFolder = () => {
    if (!logFilePath) return;
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('open-folder', logFilePath);
    } catch (e) {
      console.warn('Electron API not available:', e.message);
    }
  };

  return (
    <div
      className="border-t relative"
      style={{
        backgroundColor: 'rgba(0,0,0,0.85)',
        borderColor: 'var(--border-color)',
        backdropFilter: 'blur(8px)',
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-pointer select-none"
        style={{ borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center space-x-2">
          <Terminal size={13} style={{ color: 'var(--color-primary)' }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
            Geliştirici Günlükleri
          </span>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}
          >
            {logs.length}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          {logFilePath && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenFolder();
              }}
              className="p-1 rounded hover:bg-white/10 transition"
              title="Log Dosyası Konumunu Aç"
              style={{ color: 'var(--text-secondary)' }}
            >
              <FolderOpen size={12} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="p-1 rounded hover:bg-white/10 transition"
            title="Kopyala"
            style={{ color: 'var(--text-secondary)' }}
          >
            {copied ? <X size={12} /> : <Copy size={12} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearLogs();
            }}
            className="p-1 rounded hover:bg-white/10 transition"
            title="Temizle"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Trash2 size={12} />
          </button>
          <button
            className="p-1 rounded hover:bg-white/10 transition"
            style={{ color: 'var(--text-secondary)' }}
          >
            {collapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Log Content */}
      {!collapsed && (
        <div
          ref={scrollRef}
          className="overflow-y-auto"
          style={{ maxHeight: '160px', padding: '4px 8px' }}
        >
          {logs.length === 0 ? (
            <div className="text-[10px] py-2 text-center" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
              Henüz günlük kaydı yok.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-2 py-[2px] text-[10px] leading-relaxed">
                <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                  {new Date(log.timestamp).toLocaleTimeString('tr-TR')}
                </span>
                <span
                  className="font-bold uppercase tracking-wider flex-shrink-0"
                  style={{ color: LOG_COLORS[log.type] || LOG_COLORS.info, width: '50px', fontSize: '8px' }}
                >
                  [{log.type}]
                </span>
                <span style={{ color: 'rgba(255,255,255,0.85)', wordBreak: 'break-word' }}>{log.text}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DevConsole;
