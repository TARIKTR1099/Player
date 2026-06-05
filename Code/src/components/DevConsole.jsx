import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../store';
import { Terminal, X, Copy, Trash2, ChevronDown, ChevronUp, FolderOpen, AlertTriangle } from 'lucide-react';

const LOG_COLORS = {
  info: 'var(--color-primary)',
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#ef4444',
};

const DevConsole = () => {
  const { logs, clearLogs, errors, clearErrors } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState('logs'); // 'logs' | 'errors'
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
    const source = tab === 'errors' ? errors : logs;
    const text = tab === 'errors'
      ? source.map((e) => `[${new Date(e.timestamp).toLocaleTimeString('tr-TR')}] [ERROR] ${e.name}: ${e.message}${e.componentStack ? '\n' + e.componentStack : ''}`).join('\n')
      : source.map((log) => `[${new Date(log.timestamp).toLocaleTimeString('tr-TR')}] [${log.type.toUpperCase()}] ${log.text}`).join('\n');
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
        <div className="flex items-center gap-2">
          <Terminal size={13} style={{ color: 'var(--color-primary)' }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
            Geliştirici Günlükleri
          </span>
          {/* Tab buttons */}
          <button
            onClick={(e) => { e.stopPropagation(); setTab('logs'); }}
            className={`text-[9px] px-1.5 py-0.5 rounded transition ${tab === 'logs' ? '' : 'opacity-50 hover:opacity-80'}`}
            style={{
              backgroundColor: tab === 'logs' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
              color: 'var(--text-secondary)',
            }}
          >
            Log {logs.length}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setTab('errors'); }}
            className={`text-[9px] px-1.5 py-0.5 rounded transition flex items-center gap-1 ${tab === 'errors' ? '' : 'opacity-50 hover:opacity-80'}`}
            style={{
              backgroundColor: tab === 'errors' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.04)',
              color: tab === 'errors' ? '#ef4444' : 'var(--text-secondary)',
            }}
          >
            <AlertTriangle size={9} />
            Hata {errors.length}
          </button>
        </div>
        <div className="flex items-center gap-1">
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
              if (tab === 'errors') {
                clearErrors();
              } else {
                clearLogs();
              }
            }}
            className="p-1 rounded hover:bg-white/10 transition"
            title={tab === 'errors' ? 'Hataları Temizle' : 'Temizle'}
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

      {/* Content */}
      {!collapsed && tab === 'logs' && (
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
              <div key={log.id} className="flex items-start gap-2 py-[2px] text-[10px] leading-relaxed">
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

      {/* Error Content */}
      {!collapsed && tab === 'errors' && (
        <div
          className="overflow-y-auto"
          style={{ maxHeight: '160px', padding: '4px 8px' }}
        >
          {errors.length === 0 ? (
            <div className="text-[10px] py-2 text-center" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
              Kaydedilmiş hata yok. 🎉
            </div>
          ) : (
            errors.map((err) => (
              <div key={err.id} className="flex items-start gap-2 py-[3px] text-[10px] leading-relaxed">
                <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                  {new Date(err.timestamp).toLocaleTimeString('tr-TR')}
                </span>
                <span
                  className="font-bold uppercase tracking-wider flex-shrink-0"
                  style={{ color: '#ef4444', width: '50px', fontSize: '8px' }}
                >
                  [ERROR]
                </span>
                <div style={{ color: 'rgba(255,255,255,0.85)', wordBreak: 'break-word', flex: 1 }}>
                  <span className="font-semibold">{err.name}: </span>
                  <span>{err.message}</span>
                  {err.componentStack && (
                    <summary className="text-[8px] mt-0.5 opacity-50 cursor-pointer hover:opacity-80"
                      onClick={(e) => {
                        const pre = e.currentTarget.nextElementSibling;
                        if (pre) pre.style.display = pre.style.display === 'none' ? 'block' : 'none';
                      }}
                    >
                      🔧 stack trace
                    </summary>
                  )}
                  {err.componentStack && (
                    <pre style={{ display: 'none', fontSize: '7px', opacity: 0.4, marginTop: '2px', maxHeight: '60px', overflow: 'auto' }}>
                      {err.componentStack}
                    </pre>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DevConsole;
