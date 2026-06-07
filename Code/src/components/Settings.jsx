import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { t } from '../i18n';
import { Settings as SettingsIcon, Volume2, ListMusic, Download, Upload, Sliders, Info, RefreshCw, Wrench, FolderOpen, Tag, Brain, Plus, Trash2, Edit3, Save, X, Database, Copy, Check, Eye, EyeOff, User, Key, Link as LinkIcon, Puzzle, Palette, Eye as EyeIcon, Maximize, Keyboard, ChevronLeft, HardDrive, RotateCcw, Activity, Terminal, Speaker, AlertTriangle } from 'lucide-react';
import PluginSettings from './PluginSettings';
import { showToast } from './Toast';
import Statistics from './Statistics';

const openLink = (url) => {
  try {
    const { shell } = window.require('electron');
    shell.openExternal(url);
  } catch {}
};

const Settings = () => {
  const [activeSection, setActiveSection] = useState('general');
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [isResizing, setIsResizing] = useState(false);
  const [settingsSearch, setSettingsSearch] = useState('');
  const resizeRef = useRef(null);

  const navItems = [
    { id: 'general', label: 'Genel', icon: <SettingsIcon size={16} />, keywords: 'başlatma başlangıç tepsi startup' },
    { id: 'account', label: 'Hesap', icon: <User size={16} />, keywords: 'google hesap account giriş login' },
    { id: 'audio', label: 'Ses', icon: <Volume2 size={16} />, keywords: 'ses volume equalizer eq efekt preset' },
    { id: 'library', label: 'Kütüphane', icon: <ListMusic size={16} />, keywords: 'kütüphane library müzik music yedek' },
    { id: 'categories', label: 'Kategoriler', icon: <Tag size={16} />, keywords: 'kategori tag category etiket' },
    { id: 'plugins', label: 'Eklentiler', icon: <Puzzle size={16} />, keywords: 'plugin eklenti uzantı' },
    { id: 'personalization', label: 'Kişiselleştirme', icon: <Palette size={16} />, keywords: 'tema theme dil language renk color pencere window' },
    { id: 'shortcuts', label: 'Klavye Kısayolları', icon: <Keyboard size={16} />, keywords: 'kısayol shortcut tuş key' },
    { id: 'stats', label: 'İstatistikler', icon: <Activity size={16} />, keywords: 'istatistik stats sayı dinleme' },
    { id: 'ai', label: 'AI', icon: <Brain size={16} />, keywords: 'ai yapay zeka model api provider' },
    { id: 'download', label: 'İndirme', icon: <Download size={16} />, keywords: 'indirme download klasör folder' },
    { id: 'updates', label: 'Güncellemeler', icon: <RefreshCw size={16} />, keywords: 'güncelleme update sürüm version' },
    { id: 'tempmusic', label: 'Geçici Müzikler', icon: <HardDrive size={16} />, keywords: 'geçici temp müzik temizleme' },
    { id: 'advanced', label: 'Gelişmiş', icon: <Sliders size={16} />, keywords: 'gelişmiş advanced efekt log debug reset' },
    { id: 'about', label: 'Hakkında', icon: <Info size={16} />, keywords: 'hakkında about bilgi info' },
  ];

  const filteredNavItems = settingsSearch.trim()
    ? navItems.filter(item => {
        const q = settingsSearch.toLowerCase();
        return item.label.toLowerCase().includes(q) ||
               item.id.toLowerCase().includes(q) ||
               item.keywords.toLowerCase().includes(q);
      })
    : navItems;

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = Math.max(140, Math.min(400, e.clientX));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);
  
  return (
    <div className="flex h-full relative" style={{height:'100%'}}>
      <div className="flex flex-col border-r flex-shrink-0 relative" style={{width: sidebarWidth, borderColor:'var(--border-color)', backgroundColor:'var(--color-bg-secondary)'}}>
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="relative mb-3" style={{display: sidebarWidth < 100 ? 'none' : 'block'}}>
            <input
              type="text"
              value={settingsSearch}
              onChange={(e) => { setSettingsSearch(e.target.value); setActiveSection('general'); }}
              placeholder="Ayarlarda ara..."
              className="w-full px-3 py-2 rounded-lg text-xs border focus:outline-none"
              style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)', paddingLeft:'30px'}}
            />
            <svg className="absolute left-2 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:'var(--text-secondary)'}}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            {settingsSearch && (
              <button
                onClick={() => setSettingsSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                style={{color:'var(--text-secondary)'}}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <SettingsNav 
            items={filteredNavItems}
            active={activeSection}
            onChange={setActiveSection}
            narrow={sidebarWidth < 100}
          />
          {settingsSearch && filteredNavItems.length === 0 && (
            <div className="text-center py-4 text-xs" style={{color:'var(--text-secondary)'}}>
              Sonuç bulunamadı
            </div>
          )}
        </div>
        <div className="p-2 border-t flex items-center justify-center" style={{borderColor:'var(--border-color)'}}>
          <button
            onClick={() => setSidebarWidth(sidebarWidth > 100 ? 48 : 220)}
            className="p-2 rounded-lg hover:bg-white/10 transition"
            style={{color:'var(--text-secondary)'}}
            title={sidebarWidth > 100 ? 'Daralt' : 'Genişlet'}
          >
            <ChevronLeft size={16} style={{transform: sidebarWidth > 100 ? 'none' : 'rotate(180deg)'}} />
          </button>
        </div>
        <div
          ref={resizeRef}
          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition z-10"
          onMouseDown={() => setIsResizing(true)}
        />
      </div>
      
      <div className="flex-1 flex flex-col min-w-0" style={{backgroundColor:'var(--color-bg-primary)'}}>
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar" style={{minHeight:'100%'}}>
          {activeSection === 'general' && <GeneralSettings />}
          {activeSection === 'account' && <AccountSettings />}
          {activeSection === 'audio' && <AudioSettings />}
          {activeSection === 'library' && <LibrarySettings />}
          {activeSection === 'categories' && <CategorySettings />}
          {activeSection === 'plugins' && <PluginSettings />}
          {activeSection === 'personalization' && <PersonalizationSettings />}
          {activeSection === 'shortcuts' && <ShortcutsSettings />}
          {activeSection === 'stats' && <Statistics />}
          {activeSection === 'ai' && <AISettings />}
          {activeSection === 'download' && <DownloadSettings />}
          {activeSection === 'updates' && <UpdatesSettings />}
          {activeSection === 'tempmusic' && <TempMusicSettings />}
          {activeSection === 'advanced' && <AdvancedSettings />}
          {activeSection === 'about' && <AboutSettings />}
        </div>
      </div>
    </div>
  );
};

const SettingsNav = ({ items, active, onChange, narrow }) => (
  <div className="flex flex-col gap-1">
    {items.map(item => (
      <div
        key={item.id}
        onClick={() => onChange(item.id)}
        className={`flex items-center gap-3 ${narrow ? 'justify-center' : ''} p-3 rounded-xl cursor-pointer transition`}
        style={active === item.id ? {backgroundColor:'var(--color-primary)', color:'white'} : {color:'var(--text-secondary)'}}
      >
        <div className="flex-shrink-0">{item.icon}</div>
        {!narrow && <span className="text-sm font-bold truncate">{item.label}</span>}
      </div>
    ))}
  </div>
);

const GeneralSettings = () => {
  const { theme, setTheme, language, setLanguage, sidebarToggleBehavior, setSidebarToggleBehavior } = useStore();
  const [startupEnabled, setStartupEnabled] = useState(false);
  const [defaultAudioPlayer, setDefaultAudioPlayer] = useState(null); // null = loading, false = not set, true = set
  const [defaultAudioMsg, setDefaultAudioMsg] = useState('');
  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      if (!ipcRenderer) return;
      ipcRenderer.invoke('get-startup-status').then(setStartupEnabled).catch(() => {});
      ipcRenderer.invoke('get-default-audio-player-status').then(v => setDefaultAudioPlayer(v)).catch(() => {});
    } catch {}
  }, []);

  const handleStartupToggle = async (enabled) => {
    try {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('set-startup', enabled);
      setStartupEnabled(enabled);
    } catch (e) {
      console.error('Startup toggle failed:', e);
    }
  };

  const handleDefaultAudioPlayerToggle = async () => {
    setDefaultAudioMsg('');
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('set-default-audio-player', !defaultAudioPlayer);
      if (result) {
        setDefaultAudioPlayer(!defaultAudioPlayer);
        setDefaultAudioMsg(!defaultAudioPlayer ? 'Player varsayılan ses oynatıcı olarak ayarlandı' : 'Player varsayılan oynatıcı olmaktan çıkarıldı');
      } else {
        setDefaultAudioMsg('Ayarlanamadı. Lütfen Windows Ayarları > Varsayılan Uygulamalar\'dan manuel olarak ayarlayın.');
      }
    } catch (e) {
      setDefaultAudioMsg('Bir hata oluştu. Lütfen Windows Ayarlarından manuel olarak ayarlayın.');
    }
  };


  const handleDetectLanguage = () => {
    const { ipcRenderer } = window.require('electron');
    try {
      const locale = window.require('electron').ipcRenderer.invoke('get-system-locale').catch(() => 'tr');
      locale.then(lang => {
        const detected = lang.startsWith('tr') ? 'tr' : 'en';
        setLanguage(detected);
      });
    } catch {}
  };
  
  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl font-bold">Genel Ayarlar</h2>
      
      <SettingGroup title="Başlangıç" description="Uygulama başlatma ayarları">
        <SettingRow label="Windows ile başlat">
          <Toggle checked={startupEnabled} onChange={handleStartupToggle} />
        </SettingRow>
        <SettingRow label="Kapatırken tepsiye küçült">
          <MinimizeToTrayToggle />
        </SettingRow>
        <SettingRow label="Varsayılan Ses Oynatıcı">
          <div className="flex flex-col items-end gap-1">
            <button 
              onClick={handleDefaultAudioPlayerToggle}
              className="px-4 py-2 rounded-lg text-sm font-bold transition"
              style={{backgroundColor: defaultAudioPlayer ? 'rgba(255,255,255,0.1)' : 'var(--color-primary)', color:'white'}}
            >
              {defaultAudioPlayer === null ? 'Kontrol ediliyor...' : defaultAudioPlayer ? 'Varsayılanı Kaldır' : 'Varsayılan olarak ayarla'}
            </button>
            {defaultAudioMsg && (
              <span className="text-xs" style={{color: defaultAudioMsg.includes('ayarlandı') ? '#4ade80' : '#f87171'}}>{defaultAudioMsg}</span>
            )}
          </div>
        </SettingRow>
        <div className="text-xs mt-1" style={{color:'var(--text-secondary)'}}>
          .mp3, .wav, .flac, .aac, .ogg ve diğer ses formatlarını Player ile açın
        </div>
      </SettingGroup>

      <SettingGroup title="Kenar Çubuğu Davranışı" description="Menü butonuna tıklayınca kenar çubuğunun nasıl davranacağını seçin">
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'fullToggle', label: 'Tam Aç/Kapa', desc: 'Açar veya tamamen kapatır' },
            { value: 'iconsToggle', label: 'Sadece İkonlar', desc: 'İkonlara küçültür veya açar' },
          ].map(mode => (
            <button
              key={mode.value}
              onClick={() => setSidebarToggleBehavior(mode.value)}
              className="flex-1 min-w-[140px] p-3 rounded-lg text-left transition"
              style={sidebarToggleBehavior === mode.value 
                ? {backgroundColor:'var(--color-primary)', color:'white'} 
                : {backgroundColor:'rgba(255,255,255,0.05)', color:'var(--text-secondary)'}}
            >
              <div className="font-bold text-sm mb-1">{mode.label}</div>
              <div className="text-xs opacity-80">{mode.desc}</div>
            </button>
          ))}
        </div>
      </SettingGroup>

      <SettingGroup title="Pencere Boyutu" description="Kişiselleştirme > Görünüm & Dil bölümünden ayarlayın">
        <div className="p-3 rounded-lg text-sm" style={{backgroundColor:'rgba(15,108,189,0.1)', color:'var(--color-primary)'}}>
          Pencere boyutu ayarları Kişiselleştirme sekmesine taşındı.
        </div>
      </SettingGroup>
    </div>
  );
};

const AccountSettings = () => {
  const { googleUser, setGoogleUser, t } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [credMsg, setCredMsg] = useState('');
  const [credsSaved, setCredsSaved] = useState(false);

  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      if (!ipcRenderer) return;
      ipcRenderer.invoke('get-settings').then(s => {
        if (s.googleClientId) { setClientId(s.googleClientId); setCredsSaved(true); }
        if (s.googleClientSecret) setClientSecret(s.googleClientSecret);
      }).catch(() => {});
    } catch {}
  }, []);

  const handleSaveCredentials = async () => {
    setCredMsg('');
    if (!clientId.trim() || !clientSecret.trim()) {
      setCredMsg('Lütfen Client ID ve Secret değerlerini girin');
      return;
    }
    try {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('save-settings', { googleClientId: clientId.trim(), googleClientSecret: clientSecret.trim() });
      setCredMsg('Google OAuth bilgileri kaydedildi ✓');
      setCredsSaved(true);
    } catch (e) {
      setCredMsg('Kaydedilemedi: ' + e.message);
    }
  };

  const handleGoogleLogin = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Önce Google API bilgilerini girin ve kaydedin.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('google-login');
      if (result.ok) {
        setGoogleUser(result.user);
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setGoogleUser(null);
  };

  const openCloudConsole = () => {
    try {
      const { shell } = window.require('electron');
      shell.openExternal('https://console.cloud.google.com/apis/credentials');
    } catch {}
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-4" style={{color:'var(--text-primary)'}}>Hesap</h2>
      <p className="text-sm mb-6" style={{color:'var(--text-secondary)'}}>
        Google hesabınızı bağlayarak eklentileri yayınlama, veri senkronizasyonu ve yönetim özelliklerini kullanabilirsiniz.
      </p>

      <SettingGroup title="Google API Kimlik Bilgileri" description="Google Cloud Console'dan alacağınız OAuth 2.0 bilgileri">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2 p-2.5 rounded-lg text-xs mb-2" style={{backgroundColor:'rgba(66,133,244,0.1)', color:'#8ab4f8'}}>
            <Key size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <strong>Nasıl alınır:</strong> Google Cloud Console → API'ler ve Hizmetler → Kimlik Bilgileri → 
              OAuth 2.0 İstemci Kimliği oluştur → "Masaüstü Uygulaması" seç → JSON indir
              <button onClick={openCloudConsole} className="ml-1 underline hover:text-white transition">Console'a git</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{color:'var(--text-secondary)'}}>Client ID</label>
            <input
              type="text" value={clientId} onChange={e => { setClientId(e.target.value); setCredsSaved(false); }}
              placeholder="123456789-xxxxx.apps.googleusercontent.com"
              className="w-full px-3 py-2 rounded-lg text-sm border font-mono text-xs"
              style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{color:'var(--text-secondary)'}}>Client Secret</label>
            <input
              type="password" value={clientSecret} onChange={e => { setClientSecret(e.target.value); setCredsSaved(false); }}
              placeholder="GOCSPX-xxxxxxxxxx"
              className="w-full px-3 py-2 rounded-lg text-sm border font-mono text-xs"
              style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}}
            />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSaveCredentials} className="px-4 py-1.5 text-sm font-medium rounded-lg text-white transition hover:opacity-90" style={{backgroundColor:'var(--color-primary)'}}>Kaydet</button>
            {credMsg && (
              <span className="flex flex-col text-xs flex items-center gap-1" style={{color: credMsg.includes('✓') ? '#4ade80' : '#f87171'}}>
                {credMsg.includes('✓') ? <Check size={12} /> : null}
                {credMsg}
              </span>
            )}
          </div>
        </div>
      </SettingGroup>

      <SettingGroup title="Google ile Giriş">
        <SettingRow label="Google Hesabı">
          {googleUser ? (
            <div className="flex items-center gap-3">
              {googleUser.picture && (
                <img src={googleUser.picture} alt="" className="w-10 h-10 rounded-full" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{color:'var(--text-primary)'}}>{googleUser.display_name}</div>
                <div className="text-xs truncate" style={{color:'var(--text-secondary)'}}>{googleUser.email}</div>
                <div className="text-xs mt-0.5" style={{color:'var(--text-secondary)'}}>SQLite veritabanına kayıtlı</div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs rounded-lg border transition hover:bg-white/10"
                style={{borderColor:'var(--border-color)', color:'var(--text-primary)'}}>
                Çıkış Yap
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm" style={{color:'var(--text-secondary)'}}>
                  {credsSaved ? 'Google hesabınıza bağlanmak için tıklayın' : 'Önce Google API bilgilerini kaydedin'}
                </div>
              </div>
              <button
                onClick={handleGoogleLogin}
                disabled={loading || !credsSaved}
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{backgroundColor: credsSaved ? '#4285F4' : 'rgba(255,255,255,0.1)', color: credsSaved ? 'white' : 'var(--text-secondary)'}}
              >
                {loading ? (
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
                )}
                {loading ? 'Giriş yapılıyor...' : (credsSaved ? 'Google ile Giriş Yap' : 'Bilgileri Kaydedin')}
              </button>
            </div>
          )}
        </SettingRow>
        {error && (
          <div className="flex flex-col text-xs mt-2 p-2.5 rounded flex items-start gap-2" style={{backgroundColor:'rgba(255,50,50,0.1)', color:'#ff5050'}}>
            <X size={12} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </SettingGroup>
    </div>
  );
};

const AudioSettings = () => {
  const { volume, setVolume, equalizerBands, eqPresets, customPresets, selectedPreset, applyPreset, saveCustomPreset, deleteCustomPreset } = useStore();
  const [audioService, setAudioService] = useState('running');
  const [isDragging, setIsDragging] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetMsg, setPresetMsg] = useState('');
  const sliderRef = useRef(null);
  
  const restartAudioService = async () => {
    setAudioService('restarting');
    try {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('restart-audio-service');
    } catch (e) {
      console.error('Audio service restart triggered');
    }
    setTimeout(() => setAudioService('running'), 1500);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      setVolume(Math.round(pct));
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setVolume]);
  
  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl font-bold">Ses Ayarları</h2>
      
      <SettingGroup title="Ses Servisi" description="Ses çıkışı ve servis yönetimi">
        <SettingRow label="Durum">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${audioService === 'running' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-sm">
              {audioService === 'running' ? 'Çalışıyor' : 'Yeniden başlatılıyor...'}
            </span>
          </div>
        </SettingRow>
        
        <SettingRow label="Ses Servisini Yeniden Başlat">
          <button
            onClick={restartAudioService}
            disabled={audioService === 'restarting'}
            className="px-4 py-2 rounded-lg disabled:opacity-50 transition flex items-center gap-2 text-white"
            style={{backgroundColor:'var(--color-primary)'}}
          >
            <RefreshCw size={16} className={audioService === 'restarting' ? 'animate-spin' : ''} />
            <span>Yeniden Başlat</span>
          </button>
        </SettingRow>
      </SettingGroup>
      
      <SettingGroup title="Ses Seviyesi" description="Varsayılan ses seviyesi">
          <div className="flex items-center gap-4">
            <div 
              ref={sliderRef}
              className="w-48 h-8 rounded-lg cursor-pointer relative flex items-center px-2"
              style={{backgroundColor:'rgba(255,255,255,0.05)', border:'1px solid var(--border-color)'}}
              onMouseDown={(e) => { setIsDragging(true); }}
            >
              <div className="absolute left-0 top-0 h-full rounded-lg" style={{width:`${volume}%`, backgroundColor:'var(--color-primary)', opacity:0.3}} />
              <span className="relative z-10 text-sm font-bold">{volume}%</span>
            </div>
          </div>
      </SettingGroup>
      
      <SettingGroup title="Ekolayzer Presetleri" description="EQ presetlerini yönetin. Yeni preset kaydedin veya mevcut özel presetleri silin.">
        {/* Built-in presets */}
        <div className="mb-3">
          <div className="text-xs font-bold mb-2" style={{color:'var(--text-secondary)'}}>Hazır Presetler</div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(eqPresets).map(name => (
              <button
                key={name}
                onClick={() => applyPreset(name)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition hover:scale-105"
                style={{
                  backgroundColor: selectedPreset === name ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)',
                  color: selectedPreset === name ? 'white' : 'var(--text-primary)'
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        {/* Custom presets */}
        <div className="mb-3">
          <div className="text-xs font-bold mb-2" style={{color:'var(--text-secondary)'}}>Özel Presetler</div>
          {Object.keys(customPresets).length === 0 ? (
            <div className="text-xs" style={{color:'var(--text-secondary)'}}>Henüz özel preset kaydedilmemiş</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {Object.entries(customPresets).map(([name, bands]) => (
                <div key={name} className="flex items-center justify-between p-2 rounded-lg" style={{backgroundColor:'rgba(255,255,255,0.03)', border:'1px solid var(--border-color)'}}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => applyPreset(name)}
                      className="text-xs font-bold hover:opacity-80 transition"
                      style={{color: selectedPreset === name ? 'var(--color-primary)' : 'var(--text-primary)'}}
                    >
                      {name}
                    </button>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{backgroundColor:'rgba(255,255,255,0.05)', color:'var(--text-secondary)'}}>
                      {bands.map(b => b > 0 ? `+${b}` : b).join(', ')}
                    </span>
                  </div>
                  <button
                    onClick={() => { deleteCustomPreset(name); setPresetMsg('Preset silindi'); setTimeout(() => setPresetMsg(''), 2000); }}
                    className="p-1 rounded hover:bg-white/10 transition"
                    style={{color:'#ef4444'}}
                    title="Preseti Sil"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Save current EQ as preset */}
        <div className="flex items-center gap-2">
          <input
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && presetName.trim()) {
                if (eqPresets[presetName.trim()] || customPresets[presetName.trim()]) {
                  setPresetMsg('Bu isimde preset zaten var!');
                  setTimeout(() => setPresetMsg(''), 2500);
                  return;
                }
                saveCustomPreset(presetName.trim(), [...equalizerBands]);
                setPresetName('');
                setPresetMsg('Preset kaydedildi ✓');
                setTimeout(() => setPresetMsg(''), 2000);
              }
            }}
            placeholder="Yeni preset adı..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}}
          />
          <button
            onClick={() => {
              if (!presetName.trim()) return;
              if (eqPresets[presetName.trim()] || customPresets[presetName.trim()]) {
                setPresetMsg('Bu isimde preset zaten var!');
                setTimeout(() => setPresetMsg(''), 2500);
                return;
              }
              saveCustomPreset(presetName.trim(), [...equalizerBands]);
              setPresetName('');
              setPresetMsg('Preset kaydedildi ✓');
              setTimeout(() => setPresetMsg(''), 2000);
            }}
            disabled={!presetName.trim()}
            className="px-4 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-50 transition"
            style={{backgroundColor:'var(--color-primary)'}}
          >
            <Save size={14} className="inline mr-1" />
            Kaydet
          </button>
        </div>
        {presetMsg && (
          <div className={`text-xs mt-1 ${presetMsg.includes('✓') ? 'text-green-500' : 'text-red-500'}`}>
            {presetMsg}
          </div>
        )}
        <div className="text-xs mt-2" style={{color:'var(--text-secondary)'}}>
          Aktif preset: <strong>{selectedPreset}</strong> · Mevcut EQ değerlerinizi kaydetmek için ad girin ve Kaydet'e tıklayın.
        </div>
      </SettingGroup>
    </div>
  );
};

const LibrarySettings = () => {
  const { refreshLibrary } = useStore();
  const [musicFolder, setMusicFolder] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [clearing, setClearing] = useState(false);
  
  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      if (!ipcRenderer) return;
      ipcRenderer.invoke('get-settings').then(settings => {
        setMusicFolder(settings.musicFolder || '');
      }).catch(() => {});
    } catch {}
  }, []);
  
  const selectMusicFolder = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('select-music-folder');
      if (result) {
        setMusicFolder(result);
        refreshLibrary();
      }
    } catch (e) {
      console.error('Folder select failed:', e);
    }
  };

  const handleAddMusic = async (type) => {
    try {
      const { ipcRenderer } = window.require('electron');
      let result;
      switch (type) {
        case 'file':
          result = await ipcRenderer.invoke('add-music-files');
          break;
        case 'folder':
          result = await ipcRenderer.invoke('add-music-folder');
          break;
        case 'compressed':
          result = await ipcRenderer.invoke('add-music-compressed');
          break;
        case 'link':
          const url = prompt('YouTube veya müzik linki girin:');
          if (url) result = await ipcRenderer.invoke('add-music-link', url);
          break;
      }
      if (result?.ok) {
        refreshLibrary();
      }
      setShowAddMenu(false);
    } catch (e) {
      console.error('Add music failed:', e);
      setShowAddMenu(false);
    }
  };

  const handleClearLibrary = async () => {
    if (!confirm('Kütüphaneyi temizlemek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    setClearing(true);
    try {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('clear-library');
      refreshLibrary();
    } catch (e) {
      console.error('Clear library failed:', e);
    }
    setClearing(false);
  };

  const handleRepairLibrary = async () => {
    setClearing(true);
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('repair-library');
      if (result.ok) {
        refreshLibrary();
        alert(`Kütüphane onarıldı! ${result.removed} geçersiz müzik kaldırıldı.`);
      }
    } catch (e) {
      console.error('Repair library failed:', e);
    }
    setClearing(false);
  };
  
  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl font-bold">Kütüphane Ayarları</h2>
      
      <SettingGroup title="Müzik Ekle" description="Kütüphanenize müzik dosyası ekleyin">
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="px-6 py-3 rounded-xl text-white font-bold flex items-center gap-2 hover:scale-105 transition"
            style={{backgroundColor:'var(--color-primary)'}}
          >
            <Plus size={18} />
            <span>Müzik Ekle</span>
          </button>
          {showAddMenu && (
            <div className="absolute top-full left-0 mt-2 border rounded-xl py-1 shadow-2xl z-50 text-sm" style={{backgroundColor:'var(--color-bg-secondary)', borderColor:'var(--border-color)', minWidth:'200px'}}>
              <div onClick={() => handleAddMusic('file')} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition">
                <span>Dosya</span>
              </div>
              <div onClick={() => handleAddMusic('folder')} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition">
                <span>Klasör</span>
              </div>
              <div onClick={() => handleAddMusic('compressed')} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition">
                <span>Sıkıştırılmış Dosya</span>
              </div>
              <div onClick={() => handleAddMusic('link')} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition">
                <span>Link</span>
              </div>
            </div>
          )}
        </div>
      </SettingGroup>
      
      <SettingGroup title="Kütüphane Yönetimi" description="Kütüphanenizi yönetin">
        <SettingRow label="Kütüphaneyi Onar">
          <button
            onClick={handleRepairLibrary}
            disabled={clearing}
            className="px-4 py-2 rounded-lg transition flex items-center gap-2 disabled:opacity-50"
            style={{backgroundColor:'rgba(255,165,0,0.2)', color:'orange'}}
          >
            <Wrench size={16} className={clearing ? 'animate-spin' : ''} />
            <span>{clearing ? 'Onarılıyor...' : 'Onar'}</span>
          </button>
        </SettingRow>
        <div className="text-xs mt-1" style={{color:'var(--text-secondary)'}}>
          Var olmayan müzikleri kütüphaneden kaldırır
        </div>
        <SettingRow label="Kütüphaneyi Temizle">
          <button
            onClick={handleClearLibrary}
            disabled={clearing}
            className="px-4 py-2 rounded-lg transition flex items-center gap-2 disabled:opacity-50"
            style={{backgroundColor:'rgba(239,68,68,0.2)', color:'red'}}
          >
            <Trash2 size={16} className={clearing ? 'animate-spin' : ''} />
            <span>{clearing ? 'Temizleniyor...' : 'Temizle'}</span>
          </button>
        </SettingRow>
        <div className="text-xs mt-1" style={{color:'var(--text-secondary)'}}>
          Tüm müzikleri kütüphaneden kaldırır (dosyalar silinmez)
        </div>
      </SettingGroup>
      
      <SettingGroup title="Yedekleme & Geri Yükleme" description="Kütüphanenizi JSON dosyası olarak yedekleyin veya geri yükleyin">
        <SettingRow label="Kütüphaneyi Dışa Aktar (Yedekle)">
          <button
            onClick={async () => {
              try {
                const { ipcRenderer } = window.require('electron');
                const result = await ipcRenderer.invoke('export-library-json');
                if (result.ok) alert(`Kütüphane başarıyla yedeklendi!\n${result.trackCount} parça kaydedildi.`);
                else if (!result.canceled) alert('Yedekleme başarısız: ' + (result.error || 'Bilinmeyen hata'));
              } catch (e) { alert('Yedekleme hatası: ' + e.message); }
            }}
            className="flex flex-col px-4 py-2 rounded-lg transition flex items-center gap-2"
            style={{backgroundColor:'rgba(59,130,246,0.2)', color:'#60a5fa'}}
          >
            <Download size={16} />
            <span>Yedekle</span>
          </button>
        </SettingRow>
        <SettingRow label="Kütüphaneyi İçe Aktar (Geri Yükle)">
          <button
            onClick={async () => {
              try {
                const { ipcRenderer } = window.require('electron');
                const result = await ipcRenderer.invoke('import-library-json');
                if (result.ok) {
                  alert(`${result.imported} yeni parça içe aktarıldı.`);
                  window.location.reload();
                } else if (!result.canceled) alert('Geri yükleme başarısız: ' + (result.error || 'Bilinmeyen hata'));
              } catch (e) { alert('Geri yükleme hatası: ' + e.message); }
            }}
            className="flex flex-col px-4 py-2 rounded-lg transition flex items-center gap-2"
            style={{backgroundColor:'rgba(34,197,94,0.2)', color:'#4ade80'}}
          >
            <Database size={16} />
            <span>Geri Yükle</span>
          </button>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Müzik Klasörü" description="Müzik dosyalarının saklandığı konum">
        <SettingRow label="Konum">
          <div className="flex items-center gap-2">
            <span className="text-sm truncate max-w-xs" style={{color:'var(--text-secondary)'}}>{musicFolder || 'Yükleniyor...'}</span>
            <button
              onClick={selectMusicFolder}
              className="flex flex-col px-4 py-2 hover:bg-white/10 rounded-lg transition flex items-center gap-2"
              style={{backgroundColor:'rgba(255,255,255,0.05)'}}
            >
              <FolderOpen size={16} />
              <span>Değiştir</span>
            </button>
          </div>
        </SettingRow>
        <div className="text-xs mt-1" style={{color:'var(--text-secondary)'}}>
          Varsayılan: %APPDATA%\Player\Music
        </div>
      </SettingGroup>
    </div>
  );
};

const CategorySettings = () => {
  const { categories, addCategory, removeCategory } = useStore();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const handleAdd = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert('Bu kategori zaten mevcut!');
      return;
    }
    addCategory(name);
    setNewCategoryName('');
  };

  const handleRename = (cat) => {
    const name = editName.trim();
    if (!name || name === cat.name) { setEditingId(null); return; }
    if (categories.find(c => c.id !== cat.id && c.name.toLowerCase() === name.toLowerCase())) {
      alert('Bu isimde kategori zaten var!');
      return;
    }
    // Update category name in store AND update all tracks with this category
    useStore.setState((state) => ({
      categories: state.categories.map(c => c.id === cat.id ? { ...c, name } : c),
      tracks: state.tracks.map(t => t.category === cat.name ? { ...t, category: name } : t)
    }));
    setEditingId(null);
  };

  const handleDelete = (cat) => {
    if (!confirm(`"${cat.name}" kategorisini silmek istediğinize emin misiniz?`)) return;
    removeCategory(cat.id);
  };

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl font-bold">Kategoriler</h2>
      
      <SettingGroup title="Yeni Kategori Ekle" description="Müziklerinizi düzenlemek için kategori oluşturun">
        <div className="flex items-center gap-2">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Kategori adı..."
            className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none"
            style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}}
          />
          <button
            onClick={handleAdd}
            disabled={!newCategoryName.trim()}
            className="px-4 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition hover:scale-105"
            style={{backgroundColor:'var(--color-primary)'}}
          >
            <Plus size={16} />
            <span>Ekle</span>
          </button>
        </div>
      </SettingGroup>

      <SettingGroup title="Mevcut Kategoriler" description={`${categories.length} kategori`}>
        {categories.length === 0 ? (
          <div className="text-center py-8" style={{color:'var(--text-secondary)'}}>
            <Tag size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Henüz kategori oluşturulmamış</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl transition hover:bg-white/5" style={{backgroundColor:'rgba(255,255,255,0.03)', border:'1px solid var(--border-color)'}}>
                {editingId === cat.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRename(cat); if (e.key === 'Escape') setEditingId(null); }}
                      autoFocus
                      className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}}
                    />
                    <div className="flex items-center" style={{gap:'7px'}}>
                      <button onClick={() => handleRename(cat)} className="p-1.5 rounded-lg hover:bg-white/10 transition" style={{color:'var(--color-primary)'}}><Save size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-white/10 transition" style={{color:'var(--text-secondary)'}}><X size={14} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Tag size={14} style={{color:'var(--color-primary)'}} />
                      <span className="text-sm font-medium">{cat.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{backgroundColor:'rgba(255,255,255,0.1)', color:'var(--text-secondary)'}}>{cat.tracks?.length || 0} müzik</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} className="p-1.5 rounded-lg hover:bg-white/10 transition" style={{color:'var(--text-secondary)'}}><Edit3 size={14} /></button>
                      <button onClick={() => handleDelete(cat)} className="p-1.5 rounded-lg hover:bg-white/10 transition" style={{color:'#ef4444'}}><Trash2 size={14} /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </SettingGroup>
    </div>
  );
};

const PersonalizationSettings = () => {
  const { accentColor, setAccentColor, transparencyLevel, setTransparencyLevel, theme, setTheme, language, setLanguage, sidebarToggleBehavior, setSidebarToggleBehavior } = useStore();
  const [localAccent, setLocalAccent] = useState(accentColor);
  const [saved, setSaved] = useState(false);
  const [windowWidth, setWindowWidth] = useState(960);
  const [windowHeight, setWindowHeight] = useState(480);

  useEffect(() => {
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.invoke('get-window-size').then(size => {
      if (size) { setWindowWidth(size.width); setWindowHeight(size.height); }
    }).catch(() => {});
  }, []);

  const presetColors = [
    '#0f6cbd', '#7c3aed', '#db2777', '#dc2626', '#ea580c',
    '#d97706', '#65a30d', '#059669', '#0891b2', '#4f46e5',
  ];

  const applyAccent = () => {
    setAccentColor(localAccent);
    document.documentElement.style.setProperty('--color-primary', localAccent);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const applyTransparency = (level) => {
    setTransparencyLevel(level);
    const opacity = 1 - (level / 100);
    document.documentElement.style.setProperty('--bg-opacity', opacity);
  };

  const handleWindowSizeChange = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('set-window-size', { width: windowWidth, height: windowHeight });
    } catch (e) { console.error('Window size change failed:', e); }
  };

  const handleResetWindowSize = async () => {
    setWindowWidth(960);
    setWindowHeight(480);
    try {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('set-window-size', { width: 960, height: 480 });
    } catch (e) { console.error('Window size reset failed:', e); }
  };

  const handleDetectLanguage = () => {
    try {
      const { ipcRenderer } = window.require('electron');
      if (!ipcRenderer) return;
      const locale = ipcRenderer.invoke('get-system-locale').catch(() => 'tr');
      locale.then(lang => {
        const detected = lang.startsWith('tr') ? 'tr' : 'en';
        setLanguage(detected);
      });
    } catch {}
  };

  const handleSystemTheme = () => {
    try {
      const { ipcRenderer } = window.require('electron');
      if (!ipcRenderer) return;
      ipcRenderer.invoke('get-system-theme').then(theme => {
        setTheme(theme === 'dark' ? 'dark' : 'light');
      }).catch(() => {});
    } catch {}
  };

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl font-bold">Kişiselleştirme</h2>

      <SettingGroup title="Vurgu Rengi" description="Arayüzün ana rengini seç">
        <div className="flex flex-wrap gap-2 mb-3">
          {presetColors.map(color => (
            <button
              key={color}
              onClick={() => { setLocalAccent(color); }}
              className="w-8 h-8 rounded-full border-2 transition hover:scale-110"
              style={{backgroundColor: color, borderColor: localAccent === color ? 'white' : 'transparent'}}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={localAccent}
            onChange={(e) => setLocalAccent(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer"
          />
          <input
            value={localAccent}
            onChange={(e) => setLocalAccent(e.target.value)}
            className="border rounded-lg px-3 py-2 w-24 text-sm font-mono"
            style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}}
          />
          <button onClick={applyAccent} className="px-4 py-2 rounded-lg text-white text-sm" style={{backgroundColor:'var(--color-primary)'}}>Uygula</button>
          {saved && <span className="text-sm text-green-500">Uygulandı!</span>}
        </div>
      </SettingGroup>

      <SettingGroup title="Saydamlık" description="Arka plan saydamlık seviyesi">
        <SettingRow label="Saydamlık Seviyesi">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              value={transparencyLevel}
              onChange={(e) => applyTransparency(parseInt(e.target.value))}
              className="w-48"
            />
            <span className="text-sm font-bold">{transparencyLevel}%</span>
          </div>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Tema" description="Arayüz teması">
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('dark')}
              className="px-4 py-2 rounded-lg text-sm transition"
              style={{backgroundColor: theme === 'dark' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', color: theme === 'dark' ? 'white' : 'var(--text-secondary)'}}
            >Koyu</button>
            <button
              onClick={() => setTheme('light')}
              className="px-4 py-2 rounded-lg text-sm transition"
              style={{backgroundColor: theme === 'light' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', color: theme === 'light' ? 'white' : 'var(--text-secondary)'}}
            >Açık</button>
            <button
              onClick={handleSystemTheme}
              className="px-4 py-2 rounded-lg text-sm transition"
              style={{backgroundColor:'rgba(255,255,255,0.05)', color:'var(--text-secondary)'}}
            >Sistem</button>
          </div>
      </SettingGroup>

      <SettingGroup title="Kenar Çubuğu Davranışı" description="Menü butonuna tıklayınca kenar çubuğunun nasıl davranacağını seçin">
        <SettingRow label="Davranış">
          <div className="flex gap-2">
            <button
              onClick={() => setSidebarToggleBehavior('fullToggle')}
              className="px-4 py-2 rounded-lg text-sm transition"
              style={{backgroundColor: sidebarToggleBehavior === 'fullToggle' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', color: sidebarToggleBehavior === 'fullToggle' ? 'white' : 'var(--text-secondary)'}}
            >Tam Aç/Kapa</button>
            <button
              onClick={() => setSidebarToggleBehavior('iconsToggle')}
              className="px-4 py-2 rounded-lg text-sm transition"
              style={{backgroundColor: sidebarToggleBehavior === 'iconsToggle' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', color: sidebarToggleBehavior === 'iconsToggle' ? 'white' : 'var(--text-secondary)'}}
            >Sadece İkonlar</button>
          </div>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Pencere Boyutu" description="Uygulama penceresinin boyutu">
        <SettingRow label="Genişlik x Yükseklik">
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              value={windowWidth} 
              onChange={(e) => setWindowWidth(parseInt(e.target.value) || 960)}
              className="border rounded-lg px-3 py-2 w-20 text-center text-sm"
              style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}}
            />
            <span style={{color:'var(--text-secondary)'}}>x</span>
            <input 
              type="number" 
              value={windowHeight} 
              onChange={(e) => setWindowHeight(parseInt(e.target.value) || 480)}
              className="border rounded-lg px-3 py-2 w-20 text-center text-sm"
              style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}}
            />
            <button onClick={handleWindowSizeChange} className="px-3 py-2 rounded-lg text-white text-sm" style={{backgroundColor:'var(--color-primary)'}}>Uygula</button>
            <button onClick={handleResetWindowSize} className="px-3 py-2 rounded-lg text-sm transition" style={{backgroundColor:'rgba(255,255,255,0.05)', color:'var(--text-secondary)'}}>Varsayılana Dön</button>
          </div>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t('settings.language')} description={t('settings.language')}>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="border rounded-lg px-4 py-2"
                style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}}
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
                <option value="auto">{t('settings.checkUpdates').replace('Check for updates', 'Auto-detect').replace('Güncellemeleri kontrol et', 'Otomatik Algıla')}</option>
              </select>
              <button onClick={handleDetectLanguage} className="px-3 py-2 rounded-lg text-xs" style={{backgroundColor:'rgba(255,255,255,0.05)', color:'var(--text-secondary)'}}>
                {t('settings.checkUpdates').replace('Check for updates', 'Detect').replace('Güncellemeleri kontrol et', 'Algıla')}
              </button>
            </div>
            <div className="text-[10px] px-2 py-1 rounded-lg" style={{backgroundColor:'rgba(255,165,0,0.1)', color:'orange'}}>
              <strong>Uyarı:</strong> Kullanıcı katkıda bulunan diller tam çeviri içermeyebilir. Eksik metinler İngilizce gösterilir.
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button 
                onClick={() => { try { window.require('electron').shell.openExternal('https://github.com/TARIKTR1099/Player/tree/main/Code/src/locales'); } catch(ex) { window.open('https://github.com/TARIKTR1099/Player/tree/main/Code/src/locales', '_blank'); } }}
                className="flex flex-col px-3 py-2 rounded-lg text-xs flex items-center gap-2"
                style={{backgroundColor:'rgba(255,255,255,0.05)', color:'var(--text-secondary)'}}
              >
                <span>GitHub ile Dil Katkıda Bulun</span>
              </button>
            </div>
          </div>
      </SettingGroup>
    </div>
  );
};

const ShortcutsSettings = () => {
  const { keyboardShortcuts, setKeyboardShortcuts } = useStore();
  const [editingId, setEditingId] = useState(null);
  const [capturedKeys, setCapturedKeys] = useState([]);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef(null);

  const shortcutLabels = {
    'play-pause': 'Oynat/Durdur',
    'prev': 'Önceki Parça',
    'next': 'Sonraki Parça',
    'seek-back': '5sn Geri',
    'seek-fwd': '5sn İleri',
    'vol-up': 'Ses Artır',
    'vol-down': 'Ses Azalt',
    'mute': 'Sessiz',
    'visualizer': 'Görselleştirici',
    'waveform': 'Dalga Formu',
    'lyrics': 'Şarkı Sözleri',
    'rename': 'Ad Değiştir',
    'delete': 'Sil',
    'settings': 'Ayarlar',
    'search': 'Arama',
    'fullscreen': 'Tam Ekran',
  };

  const keyMap = {
    'ControlLeft': 'Sol Ctrl', 'ControlRight': 'Sağ Ctrl',
    'ShiftLeft': 'Sol Shift', 'ShiftRight': 'Sağ Shift',
    'AltLeft': 'Sol Alt', 'AltRight': 'Sağ Alt',
    'MetaLeft': 'Sol Win', 'MetaRight': 'Sağ Win',
    'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→',
    ' ': 'Space', 'Escape': 'Esc', 'Delete': 'Del', 'Backspace': 'Back',
  };

  const getDisplayKey = (code) => keyMap[code] || code.replace('Key', '').replace('Digit', '');

  const formatShortcut = (shortcut) => {
    return shortcut.split('+').map(k => getDisplayKey(k)).join(' + ');
  };

  const startEdit = (id) => {
    setEditingId(id);
    setCapturedKeys([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    e.preventDefault();
    if (e.code === 'Escape') {
      setEditingId(null);
      setCapturedKeys([]);
      return;
    }
    if (e.code === 'Enter' && capturedKeys.length > 0) {
      const keyStr = capturedKeys.join('+');
      
      // Check for conflicts - if same key exists elsewhere, swap them
      const conflictId = Object.entries(keyboardShortcuts).find(([id, shortcut]) => 
        id !== editingId && shortcut === keyStr
      )?.[0];
      
      if (conflictId) {
        // Swap: give conflict the old key of editingId
        const oldKey = keyboardShortcuts[editingId];
        setKeyboardShortcuts({ 
          ...keyboardShortcuts, 
          [editingId]: keyStr,
          [conflictId]: oldKey
        });
      } else {
        setKeyboardShortcuts({ ...keyboardShortcuts, [editingId]: keyStr });
      }
      
      setEditingId(null);
      setCapturedKeys([]);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      return;
    }
    if (!capturedKeys.includes(e.code)) {
      setCapturedKeys(prev => [...prev, e.code]);
    }
  };

  const resetDefaults = () => {
    setKeyboardShortcuts({
      'play-pause': 'Space',
      'prev': 'ShiftRight+ArrowLeft',
      'next': 'ShiftRight+ArrowRight',
      'seek-back': 'ArrowLeft',
      'seek-fwd': 'ArrowRight',
      'vol-up': 'ArrowUp',
      'vol-down': 'ArrowDown',
      'mute': 'KeyM',
      'visualizer': 'KeyV',
      'waveform': 'KeyW',
      'lyrics': 'KeyL',
      'rename': 'F2',
      'delete': 'Delete',
      'settings': 'ControlLeft+Comma',
      'search': 'ControlLeft+KeyF',
      'fullscreen': 'F11',
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl font-bold">Klavye Kısayolları</h2>

      <SettingGroup title="Kısayollar" description="Tüm klavye kısayollarını görüntüle ve düzenle">
        <div className="text-xs mb-3 px-2 py-1 rounded-lg" style={{backgroundColor:'rgba(15,108,189,0.1)', color:'var(--color-primary)'}}>
          <strong>İpucu:</strong> Düzenle butonuna tıklayın ve istediğiniz tuşlara basın. Enter ile kaydedin, Esc ile iptal edin. Sol/Sağ Ctrl, Shift, Alt ayrımı yapılır.
        </div>
        <div className="flex flex-col gap-2">
          {Object.entries(shortcutLabels).map(([id, label]) => (
            <div key={id} className="flex items-center justify-between p-3 rounded-xl" style={{backgroundColor:'rgba(255,255,255,0.03)'}}>
              <span className="text-sm font-medium">{label}</span>
              {editingId === id ? (
                <div className="flex items-center gap-2">
                  <div
                    ref={inputRef}
                    className="border rounded-lg px-3 py-1 text-sm font-mono min-w-[120px] text-center"
                    style={{backgroundColor:'rgba(15,108,189,0.15)', borderColor:'var(--color-primary)', color:'var(--color-primary)'}}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                  >
                    {capturedKeys.length > 0 ? capturedKeys.map(getDisplayKey).join(' + ') : 'Tuşlara basın...'}
                  </div>
                  <button onClick={() => { setEditingId(null); setCapturedKeys([]); }} className="text-red-500 hover:text-red-400"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 rounded-lg text-sm font-mono" style={{backgroundColor:'rgba(255,255,255,0.1)', color:'var(--text-primary)'}}>{formatShortcut(keyboardShortcuts[id] || '')}</kbd>
                  <button onClick={() => startEdit(id)} className="text-blue-500 hover:text-blue-400"><Edit3 size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </SettingGroup>

      <div className="flex items-center gap-3">
        <button onClick={resetDefaults} className="px-4 py-2 rounded-lg text-sm transition" style={{backgroundColor:'rgba(255,255,255,0.05)', color:'var(--text-secondary)'}}>
          Varsayılana Dön
        </button>
        {saved && <span className="text-sm text-green-500">Kaydedildi!</span>}
      </div>

      <SettingGroup title="Eklenti Desteği" description="Eklentiler özel kısayollar ekleyebilir">
        <div className="text-sm" style={{color:'var(--text-secondary)'}}>
          Yüklü eklentiler kendi klavye kısayollarını tanımlayabilir. Eklenti ayarlarından bu kısayolları yönetebilirsiniz.
        </div>
      </SettingGroup>
    </div>
  );
};

const AISettings = () => {
  const { 
    aiProvider, aiModels, aiHeaders, aiSelectedModel, setAiSelectedModel,
    categories, addCategory, removeCategory
  } = useStore();
  const [providerId, setProviderId] = useState(aiProvider.id);
  const [providerName, setProviderName] = useState(aiProvider.name);
  const [baseUrl, setBaseUrl] = useState(aiProvider.baseUrl);
  const [apiKey, setApiKey] = useState(aiProvider.apiKey);
  const [headers, setHeaders] = useState(aiHeaders);
  const [newHeaderName, setNewHeaderName] = useState('');
  const [newHeaderValue, setNewHeaderValue] = useState('');
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [categorizing, setCategorizing] = useState(false);

  const handleSaveProvider = () => {
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.invoke('save-ai-settings', {
      provider: { id: providerId, name: providerName, baseUrl, apiKey },
      models: aiModels,
      headers,
      selectedModel: aiSelectedModel,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) { setTestResult({ ok: false, msg: 'API anahtarı gerekli' }); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('test-ai-connection', {
        apiKey, baseUrl, model: aiSelectedModel, headers
      });
      setTestResult(result);
    } catch (e) {
      setTestResult({ ok: false, msg: e.message });
    }
    setTesting(false);
  };

  const addHeader = () => {
    if (newHeaderName.trim()) {
      setHeaders([...headers, { name: newHeaderName.trim(), value: newHeaderValue }]);
      setNewHeaderName('');
      setNewHeaderValue('');
    }
  };
  const removeHeader = (idx) => setHeaders(headers.filter((_, i) => i !== idx));

  const handleAddCategory = () => {
    if (newCatName.trim()) { addCategory(newCatName.trim()); setNewCatName(''); }
  };

  const handleAiCategorize = async () => {
    if (!aiProvider.apiKey.trim()) return;
    setCategorizing(true);
    try {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('ai-categorize', { 
        apiKey: aiProvider.apiKey, 
        baseUrl: aiProvider.baseUrl, 
        model: useStore.getState().aiSelectedModel,
        headers: useStore.getState().aiHeaders,
        categories: categories.map(c => c.name) 
      });
    } catch (e) { console.error('AI categorization failed:', e); }
    setCategorizing(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl font-bold">AI Yapay Zeka</h2>
      
      <SettingGroup title="AI Sağlayıcı Ayarları" description="AI sağlayıcı bağlantı bilgileri">
        <div className="p-3 rounded-xl mb-4 text-xs" style={{backgroundColor:'rgba(15,108,189,0.1)', color:'var(--color-primary)'}}>
          <strong>API Anahtarı Nereden Alınır?</strong><br/>
          1. <a href="https://openrouter.ai/keys" onClick={(e) => { e.preventDefault(); try { window.require('electron').shell.openExternal('https://openrouter.ai/keys'); } catch(ex) { window.open('https://openrouter.ai/keys', '_blank'); } }} className="underline font-bold">openrouter.ai/keys</a> adresine git<br/>
          2. "Create Key" butonuna tıkla<br/>
          3. Oluşturulan anahtarı buraya yapıştır
        </div>
        <SettingRow label="Sağlayıcı Kimliği">
          <input value={providerId} onChange={(e) => setProviderId(e.target.value)}
            className="border rounded-lg px-4 py-2 w-48"
            style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
        </SettingRow>
        <SettingRow label="Görünen Ad">
          <input value={providerName} onChange={(e) => setProviderName(e.target.value)}
            className="border rounded-lg px-4 py-2 w-48"
            style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
        </SettingRow>
        <SettingRow label="Temel URL">
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
            className="border rounded-lg px-4 py-2 w-72"
            style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
        </SettingRow>
        <SettingRow label="API Anahtarı">
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="border rounded-lg px-4 py-2 w-72"
            style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
        </SettingRow>
        <SettingRow label="Aktif Model">
          <select value={aiSelectedModel} onChange={(e) => setAiSelectedModel(e.target.value)}
            className="border rounded-lg px-4 py-2 w-72"
            style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}}>
            {aiModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Başlıklar" description="API istek başlıkları">
        <div className="flex flex-col gap-2 mb-3">
          {headers.map((h, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded-lg" style={{backgroundColor:'rgba(255,255,255,0.03)'}}>
              <div>
                <span className="text-xs font-bold">{h.name}</span>
                <span className="text-xs ml-2 font-mono" style={{color:'var(--text-secondary)'}}>{h.value}</span>
              </div>
              <button onClick={() => removeHeader(idx)} className="text-red-500 hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newHeaderName} onChange={(e) => setNewHeaderName(e.target.value)} placeholder="başlık-adı"
            className="flex-1 border rounded-lg px-3 py-2 text-xs"
            style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
          <input value={newHeaderValue} onChange={(e) => setNewHeaderValue(e.target.value)} placeholder="değer"
            className="flex-1 border rounded-lg px-3 py-2 text-xs"
            style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
          <button onClick={addHeader} className="px-3 py-2 rounded-lg text-white" style={{backgroundColor:'var(--color-primary)'}}><Plus size={14} /></button>
        </div>
      </SettingGroup>

      <div className="flex items-center gap-3">
        <button onClick={handleSaveProvider} className="flex flex-col px-6 py-2 rounded-lg text-white flex items-center gap-2" style={{backgroundColor:'var(--color-primary)'}}>
          <Save size={16} /> <span>Kaydet</span>
        </button>
        <button onClick={handleTestConnection} disabled={testing || !apiKey.trim()}
          className="px-6 py-2 rounded-lg text-white flex items-center gap-2 disabled:opacity-50"
          style={{backgroundColor:'rgba(255,255,255,0.1)'}}>
          <RefreshCw size={16} className={testing ? 'animate-spin' : ''} />
          <span>{testing ? 'Test ediliyor...' : 'Bağlantıyı Test Et'}</span>
        </button>
        {saved && <span className="text-sm text-green-500">Kaydedildi!</span>}
      </div>
      {testResult && (
        <div className={`p-3 rounded-lg text-sm ${testResult.ok ? 'text-green-500' : 'text-red-500'}`}
          style={{backgroundColor: testResult.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}}>
          {testResult.ok ? 'Bağlantı başarılı!' : `Hata: ${testResult.msg}`}
        </div>
      )}

      <SettingGroup title="AI ile Kategorilendirme" description="Parçaları otomatik kategorilere ayır">
        <div className="flex gap-2 mb-3">
          <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            placeholder="Kategori adı..."
            className="flex-1 border rounded-lg px-4 py-2"
            style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
          <button onClick={handleAddCategory} className="px-4 py-2 rounded-lg text-white" style={{backgroundColor:'var(--color-primary)'}}>Ekle</button>
        </div>
        <div className="flex flex-col gap-2">
          {categories.length === 0 && <div className="text-sm" style={{color:'var(--text-secondary)'}}>Henüz kategori yok</div>}
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl" style={{backgroundColor:'rgba(255,255,255,0.03)'}}>
              <span className="font-bold text-sm">{cat.name}</span>
              <button onClick={() => removeCategory(cat.id)} className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded">Sil</button>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <button onClick={handleAiCategorize} disabled={categorizing || !aiProvider.apiKey.trim()}
            className="flex flex-col px-4 py-2 rounded-lg text-white disabled:opacity-50 transition flex items-center gap-2"
            style={{backgroundColor:'var(--color-primary)'}}>
            {categorizing ? <RefreshCw size={16} className="animate-spin" /> : <Brain size={16} />}
            <span>{categorizing ? 'Kategorilendiriliyor...' : 'AI ile Kategorilendir'}</span>
          </button>
        </div>
      </SettingGroup>
    </div>
  );
};

const DownloadSettings = () => {
  const [downloadDir, setDownloadDir] = useState('');

  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('get-settings').then(s => {
        if (s.downloadDir) setDownloadDir(s.downloadDir);
      });
    } catch {}
  }, []);

  const handleSelectDir = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const dir = await ipcRenderer.invoke('select-download-dir');
      if (dir) setDownloadDir(dir);
    } catch {}
  };

  const handleResetDir = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('save-settings', { downloadDir: '' });
      setDownloadDir('');
    } catch {}
  };

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl font-bold">İndirme Ayarları</h2>
      
      <SettingGroup title="İndirme Klasörü" description="YouTube ve link indirmelerinin kaydedileceği klasör">
        <SettingRow label="Klasör">
          <div className="flex items-center gap-2 w-full">
            <input readOnly value={downloadDir || 'Varsayılan (Müzik Klasörü)'}
              className="flex-1 border rounded-lg px-3 py-2 text-xs truncate"
              style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
            <button onClick={handleSelectDir}
              className="p-2 rounded-lg transition hover:bg-white/10"
              style={{color:'var(--color-primary)'}} title="Klasör Seç">
              <FolderOpen size={16} />
            </button>
            {downloadDir && (
              <button onClick={handleResetDir}
                className="p-2 rounded-lg transition hover:bg-white/10 text-xs"
                style={{color:'var(--text-secondary)'}} title="Varsayılana Sıfırla">
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </SettingRow>
      </SettingGroup>
      
      <SettingGroup title="Varsayılan Format" description="İndirilen dosyaların formatı">
        <SettingRow label="Format">
          <select className="border rounded-lg px-4 py-2" style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}}>
            <option value="mp3">MP3 (Ses)</option>
            <option value="mp4">MP4 (Video)</option>
          </select>
        </SettingRow>
      </SettingGroup>
    </div>
  );
};

const UpdatesSettings = () => {
  const [checkOnStartup, setCheckOnStartup] = useState(true);
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  const handleCheckUpdates = async () => {
    setChecking(true);
    setUpdateInfo(null);
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('check-for-updates');
      setUpdateInfo(result);
    } catch (e) {
      setUpdateInfo({ available: false, error: e.message });
    }
    setChecking(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl font-bold">Güncellemeler</h2>
      
      <SettingGroup title="Otomatik Güncelleme" description="Uygulama güncellemelerini yönet">
        <SettingRow label="Başlangıçta güncellemeleri kontrol et">
          <Toggle checked={checkOnStartup} onChange={setCheckOnStartup} />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Manuel Kontrol" description="Güncellemeleri manuel olarak kontrol et">
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleCheckUpdates} 
            disabled={checking}
            className="px-4 py-2 rounded-lg text-white transition flex items-center gap-2 disabled:opacity-50"
            style={{backgroundColor:'var(--color-primary)'}}
          >
            {checking ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            <span>{checking ? 'Kontrol ediliyor...' : 'Güncellemeleri Denetle'}</span>
          </button>
          
          {updateInfo && (
            <div className="p-4 rounded-lg" style={{backgroundColor: updateInfo.available ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)'}}>
              <div className="text-sm font-bold mb-1">
                {updateInfo.available ? '🎉 Yeni güncelleme mevcut!' : '✓ Uygulamanız güncel'}
              </div>
              {updateInfo.version && (
                <div className="text-xs" style={{color:'var(--text-secondary)'}}>
                  {updateInfo.available
                    ? `Yeni sürüm: v${updateInfo.version}`
                    : `Mevcut sürüm: v${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : (updateInfo.version || '1.0.0')}`}
                </div>
              )}
              {updateInfo.error && (
                <div className="text-xs text-red-500 mt-1">{updateInfo.error}</div>
              )}
            </div>
          )}
        </div>
      </SettingGroup>

      <SettingGroup title="Sürüm Bilgisi" description="Yüklü uygulama sürümü">
        <div className="text-sm" style={{color:'var(--text-secondary)'}}>
          Player v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'}
        </div>
      </SettingGroup>
    </div>
  );
};

const TempMusicSettings = () => {
  const [clearing, setClearing] = useState(false);
  const [info, setInfo] = useState(null);

  const clearTempMusic = async () => {
    setClearing(true);
    setInfo(null);
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('clear-temp-music');
      if (result.ok) {
        setInfo({ type: 'success', msg: `${result.deleted} geçici dosya temizlendi.` });
      } else {
        setInfo({ type: 'error', msg: result.error || 'Temizleme başarısız.' });
      }
    } catch (e) {
      setInfo({ type: 'error', msg: e.message });
    }
    setClearing(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl font-bold">Geçici Müzikler</h2>

      <SettingGroup title="Anında Dinle" description="YouTube aramasından 'Anında Dinle' ile oynatılan müzikler geçici olarak indirilir. Bunlar kütüphaneye eklenmez, belirli süre sonra otomatik silinir.">
        <div className="flex flex-col p-4 rounded-xl gap-3" style={{backgroundColor:'var(--color-bg-secondary)'}}>
          <div className="flex items-center gap-2 text-sm">
            <HardDrive size={16} style={{color:'var(--color-primary)'}} />
            <span>Geçici müzikler 24 saat sonra otomatik temizlenir.</span>
          </div>
          <button
            onClick={clearTempMusic}
            disabled={clearing}
            className="px-4 py-2 rounded-xl text-white text-sm font-bold transition disabled:opacity-50"
            style={{backgroundColor:'var(--color-primary)'}}
          >
            {clearing ? 'Temizleniyor...' : 'Geçici Müzikleri Temizle'}
          </button>
          {info && (
            <div className={`text-sm p-3 rounded-lg ${
              info.type === 'success' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
            }`}>
              {info.msg}
            </div>
          )}
        </div>
      </SettingGroup>
    </div>
  );
};

const AboutSettings = () => {
  const [pwaInstallable, setPwaInstallable] = useState(false);
  useEffect(() => {
    const handler = (e) => setPwaInstallable(!!e.detail);
    document.addEventListener('pwa-install-ready', handler);
    return () => document.removeEventListener('pwa-install-ready', handler);
  }, []);
  const handleInstall = async () => {
    if (!window.deferredInstallPrompt) return;
    try {
      window.deferredInstallPrompt.prompt();
      const result = await window.deferredInstallPrompt.userChoice;
      if (result?.outcome === 'accepted') {
        showToast('Uygulama kuruldu!', 'success');
      } else {
        showToast('Kurulum iptal edildi', 'info');
      }
    } catch (e) {
      showToast('Kurulum hatası', 'error');
    }
    window.deferredInstallPrompt = null;
    setPwaInstallable(false);
  };
  return (
  <div className="flex flex-col gap-8">
    <h2 className="text-2xl font-bold">Hakkında</h2>
    <SettingGroup title="Player Music" description="Modern müzik çalar uygulaması">
      <div className="flex flex-col text-sm gap-2" style={{color:'var(--text-secondary)'}}>
        <p>Sürüm: 1.0.0</p>
        <p>Geliştirici: TARIKELER</p>
        {pwaInstallable && (
          <button
            onClick={handleInstall}
            className="mt-3 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition shadow-lg text-white self-start"
            style={{backgroundColor:'var(--color-primary)'}}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Uygulamayı Yükle
          </button>
        )}
      </div>
    </SettingGroup>
    <SettingGroup title="Geliştirici" description="Bağlantılar ve iletişim">
      <div className="flex flex-col gap-2">
        {[
          {
            name: 'GitHub',
            url: 'https://github.com/TARIKTR1099',
            icon: <svg width="20" height="20" viewBox="0 0 176 176" fill="currentColor"><path d="m152 0h-128a24 24 0 0 0 -24 24v128a24 24 0 0 0 24 24h128a24 24 0 0 0 24-24v-128a24 24 0 0 0 -24-24zm-46.75 140.55c-2.82.54-3.78-1.16-3.78-2.57 0-1.76.07-7.57.07-14.8 0-5.07-1.79-8.38-3.71-10 12.23-1.33 25.09-5.9 25.09-26.66a20.71 20.71 0 0 0 -5.64-14.52c.55-1.37 2.41-6.87-.55-14.31 0 0-4.6-1.45-15 5.54a52.85 52.85 0 0 0 -27.5 0c-10.52-7-15.13-5.54-15.13-5.54-3 7.46-1.1 12.96-.53 14.31a20.64 20.64 0 0 0 -5.66 14.5c0 20.7 12.84 25.35 25 26.7a11.45 11.45 0 0 0 -3.48 7.23c-3.15 1.38-11.12 3.77-16-4.49 0 0-2.9-5.2-8.42-5.57 0 0-5.37-.07-.39 3.28 0 0 3.62 1.67 6.12 7.9 0 0 3.23 10.51 18.53 7.26 0 4.5.06 7.9.06 9.19s-1 3.1-3.75 2.59c-21.82-7.12-37.58-27.37-37.58-51.25 0-29.85 24.61-54 55-54s55 24.2 55 54.05c0 23.79-15.74 44.06-37.75 51.16z"/></svg>
          },
          {
            name: 'GitGit',
            url: 'https://gitgit.me/tarikeler',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          },
        ].map((link, idx) => (
          <div key={idx}
               onClick={() => openLink(link.url)}
               className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-white/5 transition">
            <div className="flex items-center gap-3">
              <span className="text-lg">{link.icon}</span>
              <span className="text-sm font-bold">{link.name}</span>
            </div>
            <span className="text-xs font-mono" style={{color:'var(--text-secondary)'}}>{link.url}</span>
          </div>
        ))}
      </div>
    </SettingGroup>
  </div>
  );
};


const AdvancedSettings = () => {
  const { refreshLibrary, resetAudioSettings, resetVideoSettings, resetAllEffects, effectsBypass, setEffectsBypass, devLogsEnabled, setDevLogsEnabled } = useStore();
  const [logFilePath, setLogFilePath] = useState('');
  const [logCopied, setLogCopied] = useState('');
  const [repairing, setRepairing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [audioResetMsg, setAudioResetMsg] = useState('');
  const [videoResetMsg, setVideoResetMsg] = useState('');
  const [allResetMsg, setAllResetMsg] = useState('');
  
  useEffect(() => {
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.invoke('get-log-path').then(path => setLogFilePath(path)).catch(() => {});
  }, []);
  
  const handleExportLogs = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('read-log-file');
      if (result.ok && result.content) {
        await navigator.clipboard.writeText(result.content);
        setLogCopied('Panoya kopyalandı!');
        setTimeout(() => setLogCopied(''), 3000);
      } else {
        setLogCopied('Henüz log kaydı yok');
        setTimeout(() => setLogCopied(''), 3000);
      }
    } catch {
      setLogCopied('Hata oluştu');
      setTimeout(() => setLogCopied(''), 3000);
    }
  };

  const handleOpenLogFolder = () => {
    if (!logFilePath) return;
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.invoke('open-folder', logFilePath);
  };

  const repairLibrary = async () => {
    setRepairing(true);
    try {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('repair-library');
      await refreshLibrary();
    } catch (e) {
      console.error('Repair failed:', e);
    }
    setTimeout(() => setRepairing(false), 2000);
  };

  const resetAndRescanLibrary = async () => {
    if (!confirm('Kütüphaneyi sıfırlayıp yeniden taramak istediğinize emin misiniz? Bu işlem mevcut kütüphane verilerini siler ve klasörü yeniden tarar.')) return;
    setResetting(true);
    try {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('reset-and-rescan-library');
      await refreshLibrary();
      alert('Kütüphane sıfırlandı ve yeniden tarandı!');
    } catch (e) {
      console.error('Reset and rescan failed:', e);
      alert('İşlem başarısız oldu: ' + e.message);
    }
    setResetting(false);
  };

  const handleResetAudio = () => {
    resetAudioSettings();
    setAudioResetMsg('Ses ayarları fabrika ayarlarına döndürüldü');
    setTimeout(() => setAudioResetMsg(''), 3000);
  };

  const handleResetVideo = () => {
    resetVideoSettings();
    setVideoResetMsg('Görüntü ayarları fabrika ayarlarına döndürüldü');
    setTimeout(() => setVideoResetMsg(''), 3000);
  };

  const handleResetAll = () => {
    resetAllEffects();
    setAllResetMsg('Tüm efektler sıfırlandı ve devre dışı bırakıldı');
    setTimeout(() => setAllResetMsg(''), 3000);
  };
  
  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl font-bold">Gelişmiş Ayarlar</h2>

      <SettingGroup title="Ses İşleme Kontrolü" description="Tüm ses efektlerini tamamen devre dışı bırak / etkinleştir">
        <p className="text-sm" style={{color:'var(--text-secondary)'}}>
          Bu ayar açıkken tüm ses işleme zinciri (EQ, kompresör, spatial, delay, expander, netlik, bas) tamamen baypas edilir ve ham ses doğrudan çıkışa gönderilir.
          Ses ayarlarına hiç dokunulmaz, sadece işleme devre dışı bırakılır.
        </p>
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => setEffectsBypass(!effectsBypass)}
            className="px-5 py-2 rounded-lg font-bold flex items-center gap-2 transition"
            style={{
              backgroundColor: effectsBypass ? '#059669' : 'rgba(255,255,255,0.1)',
              color: 'white'
            }}
          >
            <Speaker size={16} />
            <span>{effectsBypass ? 'Efektler Devre Dışı (Temiz Ses)' : 'Efektler Aktif'}</span>
          </button>
          <span className={`text-xs ${effectsBypass ? 'text-green-500' : 'text-yellow-500'}`}>
            {effectsBypass ? '✓ Ses işleme baypas edildi, orijinal ses dinleniyor' : 'Ses işleme zinciri aktif'}
          </span>
        </div>
      </SettingGroup>

      <SettingGroup title="Geliştirici Günlükleri" description="Uygulama içi geliştirici konsolunu ve dosya loglarını yönetin">
        <div className="flex items-center justify-between p-4 rounded-xl" style={{backgroundColor:'rgba(255,255,255,0.03)'}}>
          <div className="flex items-center gap-3">
            <Terminal size={18} style={{color:'var(--color-primary)'}} />
            <div>
              <div className="text-sm font-bold">Geliştirici Günlüklerini Aç</div>
              <div className="text-xs" style={{color:'var(--text-secondary)'}}>
                Oynatma, efektler ve sistem olaylarını canlı takip edin
              </div>
            </div>
          </div>
          <Toggle checked={devLogsEnabled} onChange={setDevLogsEnabled} />
        </div>
        {/* Log dosyası bilgisi ve butonlar */}
        <div className="mt-3 p-3 rounded-xl" style={{backgroundColor:'rgba(255,255,255,0.03)'}}>
          <div className="text-xs mb-2" style={{color:'var(--text-secondary)'}}>
            <span className="font-bold">Log Dosyası Konumu:</span>
            <div className="flex flex-col mt-1 flex items-center gap-2">
              <code className="text-[10px] break-all" style={{color:'var(--color-primary)', opacity:0.8}}>
                {logFilePath || 'Yükleniyor...'}
              </code>
              <button
                onClick={handleOpenLogFolder}
                className="p-1.5 rounded hover:bg-white/10 transition flex-shrink-0"
                title="Klasörü Aç"
                style={{color:'var(--text-secondary)'}}
              >
                <FolderOpen size={14} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleExportLogs}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition hover:opacity-80"
              style={{backgroundColor:'rgba(255,255,255,0.1)', color:'var(--text-primary)'}}
            >
              <Copy size={12} />
              Logları Panoya Kopyala
            </button>
            {logCopied && (
              <span className="text-[10px] animate-pulse" style={{color:'#4ade80'}}>{logCopied}</span>
            )}
          </div>
        </div>
      </SettingGroup>

      <SettingGroup title="Tüm Efektleri Sıfırla" description="Tüm ses ve görüntü ayarlarını tek seferde fabrika varsayılanlarına döndürür ve efektleri devre dışı bırakır">
        <p className="text-sm" style={{color:'var(--text-secondary)'}}>
          Bu işlem; EQ, ses efektleri, kompresör, spatial, delay, expander, video efektleri ve görselleştiricileri fabrika ayarlarına döndürür ve tüm efektleri devre dışı bırakır.
        </p>
        <div className="flex items-center gap-3">
          <button onClick={handleResetAll}
            className="px-5 py-2 rounded-lg text-white flex items-center gap-2 transition hover:opacity-90"
            style={{backgroundColor:'#dc2626'}}>
            <RotateCcw size={16} />
            <span>Tüm Efektleri Sıfırla</span>
          </button>
          {allResetMsg && (
            <span className="text-xs animate-pulse" style={{color:'#4ade80'}}>{allResetMsg}</span>
          )}
        </div>
      </SettingGroup>

      <SettingGroup title="Ayarları Dışa/İçe Aktar" description="Tüm uygulama ayarlarını JSON dosyası olarak kaydedin veya geri yükleyin">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => {
            try {
              const state = useStore.getState();
              const exportData = {
                version: '1.0.0',
                date: new Date().toISOString(),
                settings: {
                  volume: state.volume, theme: state.theme, language: state.language,
                  equalizerBands: state.equalizerBands, audioEffects: state.audioEffects,
                  effectsBypass: state.effectsBypass, shuffleMode: state.shuffleMode,
                  repeatMode: state.repeatMode, crossfadeDuration: state.crossfadeDuration,
                  playbackRate: state.playbackRate, showVisualizer: state.showVisualizer,
                  showWaveform: state.showWaveform, showLyrics: state.showLyrics,
                  sleepTimer: state.sleepTimer, volumeBoost: state.volumeBoost,
                  layoutMode: state.layoutMode, selectedCategory: state.selectedCategory,
                  sortBy: state.sortBy, sortDir: state.sortDir,
                }
              };
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `player-settings-${new Date().toISOString().slice(0,10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            } catch (e) { alert('Dışa aktarma hatası: ' + e.message); }
          }} className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition hover:opacity-80"
            style={{backgroundColor:'rgba(255,255,255,0.1)', color:'var(--text-primary)'}}>
            <Download size={14} /> Ayarları Dışa Aktar
          </button>
          <label className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition hover:opacity-80 cursor-pointer"
            style={{backgroundColor:'rgba(255,255,255,0.1)', color:'var(--text-primary)'}}>
            <Upload size={14} /> Ayarları İçe Aktar
            <input type="file" accept=".json" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => {
                try {
                  const data = JSON.parse(ev.target.result);
                  if (!data.settings) { alert('Geçersiz ayar dosyası'); return; }
                  useStore.setState(data.settings);
                  alert('Ayarlar başarıyla içe aktarıldı!');
                } catch (err) { alert('Okuma hatası: ' + err.message); }
              };
              reader.readAsText(file);
            }} />
          </label>
          <button onClick={() => {
            if (!confirm('Tüm ayarlar fabrika varsayılanlarına döndürülecek. Emin misiniz?')) return;
            localStorage.removeItem('player-v4-storage');
            useStore.setState({
              volume: 80, theme: 'dark', language: 'tr', shuffleMode: false, repeatMode: 'off',
              crossfadeDuration: 0, playbackRate: 1, showVisualizer: false, showWaveform: false,
              showLyrics: false, sleepTimer: null, volumeBoost: 1.0, layoutMode: 'normal',
              effectsBypass: true, sortBy: 'title', sortDir: 'asc',
              equalizerBands: [0,0,0,0,0,0,0,0,0,0],
              audioEffects: { clarity:0, ambiance:0, surround:0, dynamicPower:0, bassBoost:0, compressor:0, delay:0, expander:0 },
            });
            alert('Ayarlar sıfırlandı! Sayfa yenilenecek.');
            window.location.reload();
          }} className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition hover:opacity-80"
            style={{backgroundColor:'#dc2626', color:'white'}}>
            <RotateCcw size={14} /> Tüm Ayarları Sıfırla
          </button>
        </div>
      </SettingGroup>

      <SettingGroup title="Ses Ayarlarını Sıfırla" description="Equalizer, ses efektleri ve ses işleme ayarlarını fabrika varsayılanlarına döndürür">
        <p className="text-sm" style={{color:'var(--text-secondary)'}}>
          Bu işlem EQ bantlarını, ses efektlerini (netlik, ambiyans, surround, dinamik güç, bas güçlendirme)
          ve ses işleme ayarlarını (kompresör, gecikme, genişletici) sıfırlar.
        </p>
        <div className="flex items-center gap-3">
          <button onClick={handleResetAudio}
            className="px-5 py-2 rounded-lg text-white flex items-center gap-2 transition hover:opacity-90"
            style={{backgroundColor:'#ef4444'}}>
            <Volume2 size={16} />
            <span>Ses Ayarlarını Sıfırla</span>
          </button>
          {audioResetMsg && (
            <span className="text-xs animate-pulse" style={{color:'#4ade80'}}>{audioResetMsg}</span>
          )}
        </div>
      </SettingGroup>

      <SettingGroup title="Görüntü Ayarlarını Sıfırla" description="Video efektleri ve görüntüleme ayarlarını fabrika varsayılanlarına döndürür">
        <p className="text-sm" style={{color:'var(--text-secondary)'}}>
          Bu işlem video efektlerini (parlaklık, kontrast, doygunluk, gamma, keskinlik, kırpma, döndürme, yakınlaştırma)
          ve görüntüleme modlarını (görselleştirici, dalga formu) sıfırlar.
        </p>
        <div className="flex items-center gap-3">
          <button onClick={handleResetVideo}
            className="px-5 py-2 rounded-lg text-white flex items-center gap-2 transition hover:opacity-90"
            style={{backgroundColor:'#ef4444'}}>
            <Eye size={16} />
            <span>Görüntü Ayarlarını Sıfırla</span>
          </button>
          {videoResetMsg && (
            <span className="text-xs animate-pulse" style={{color:'#4ade80'}}>{videoResetMsg}</span>
          )}
        </div>
      </SettingGroup>
    </div>
  );
};

const SettingGroup = ({ title, description, children }) => (
  <div className="flex flex-col gap-4">
    <div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm" style={{color:'var(--text-secondary)'}}>{description}</p>
    </div>
    <div className="flex flex-col gap-3">
      {children}
    </div>
  </div>
);

const SettingRow = ({ label, children }) => (
  <div className="flex items-center justify-between py-3 border-b" style={{borderColor:'var(--border-color)'}}>
    <span className="text-sm font-medium">{label}</span>
    <div>{children}</div>
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-12 h-6 rounded-full transition relative`}
    style={{backgroundColor: checked ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'}}
  >
    <div
      className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

export default Settings;

// Minimize-to-tray toggle component
const MinimizeToTrayToggle = () => {
  const [minimizeToTray, setMinimizeToTrayState] = useState(true);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.invoke('get-settings').then(s => setMinimizeToTrayState(s.minimizeToTray !== false)).catch(() => {});
  }, []);
  const handleToggle = async () => {
    setLoading(true);
    try {
      const { ipcRenderer } = window.require('electron');
      const newVal = !minimizeToTray;
      await ipcRenderer.invoke('save-settings', { minimizeToTray: newVal });
      setMinimizeToTrayState(newVal);
    } catch (e) { console.error('Toggle minimize-to-tray failed:', e); }
    setLoading(false);
  };
  return <Toggle checked={minimizeToTray} onChange={handleToggle} disabled={loading} />;
};
