import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, RotateCcw, Music, Power, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store';

const EQ_BANDS = ['31Hz', '62Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];

const EQUALIZER_SETTINGS = {
  clarity: { label: 'Clarity', desc: 'Yüksek frekans netliği', min: 0, max: 100 },
  ambience: { label: 'Ambience', desc: 'Ortam hissi / ferahlık', min: 0, max: 100 },
  surround: { label: 'Surround', desc: 'Stereo genişliği', min: 0, max: 100 },
  dynamicBoost: { label: 'Dynamic Boost', desc: 'Dinamik bas güçlendirme', min: 0, max: 100 },
  bassBoost: { label: 'Bass Boost', desc: 'Bas seviyesi', min: 0, max: 100 },
};

const EqualizerModal = ({ onClose }) => {
  const {
    equalizerBands, setEqualizerBand, audioEffects, setAudioEffect,
    applyPreset, selectedPreset, saveCustomPreset, deleteCustomPreset,
    customPresets, eqPresets, currentTrack, perTrackEq, setPerTrackEq,
    perTrackEffects, effectsBypass, setEffectsBypass
  } = useStore();
  
  const [newPresetName, setNewPresetName] = useState('');
  const [activeTab, setActiveTab] = useState('eq');
  const [perTrackMode, setPerTrackMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [showToast, setShowToast] = useState(false);
  
  const allPresets = { ...eqPresets, ...customPresets };
  
  const showFeedback = (msg) => {
    setToast(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };
  
  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      saveCustomPreset(newPresetName.trim(), [...equalizerBands]);
      setNewPresetName('');
      showFeedback('✅ Preset kaydedildi');
    }
  };
  
  const toggleBypass = () => {
    useStore.getState().setEffectsBypass(!useStore.getState().effectsBypass);
  };
  
  const handleReset = () => {
    // Reset all EQ bands to 0
    const defaultBands = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    defaultBands.forEach((val, idx) => setEqualizerBand(idx, val));
    // Reset audio effects to 0
    const defaultEffects = { clarity: 0, ambience: 0, surround: 0, dynamicBoost: 0, bassBoost: 0 };
    Object.entries(defaultEffects).forEach(([key, val]) => setAudioEffect(key, val));
    // Reset bypass to true (off) when reset to avoid hidden processing
    setEffectsBypass(true);
    // Reset audioV2 compressor to passive defaults
    useStore.getState().setAudioV2Bulk({
      compressor: { threshold: 0, ratio: 1, knee: 30, attack: 0.003, release: 0.25, makeupGain: 0 }
    });
    showFeedback('🔄 Ayarlar sıfırlandı (Düz)');
  };
  
  const handleApplyToTrack = () => {
    if (!currentTrack) return;
    setPerTrackEq(currentTrack.id, [...equalizerBands]);
    const effects = { ...audioEffects };
    setPerTrackMode(true);
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="rounded-2xl w-full max-w-[900px] mx-4 max-h-[85vh] overflow-y-auto border shadow-2xl custom-scrollbar" 
        style={{backgroundColor:'var(--color-bg-secondary)', borderColor:'var(--color-border)'}} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {/* Toast notification */}
        {showToast && (
          <div className="fixed top-4 right-4 z-[100] px-4 py-2.5 rounded-xl text-sm font-bold shadow-2xl transition-all duration-300 animate-slide-up flex items-center gap-2"
            style={{backgroundColor:'rgba(15,108,189,0.9)', color:'white'}}>
            <Check size={16} />
            <span>{toast}</span>
          </div>
        )}
        <div className="flex items-center justify-between p-5 border-b" style={{borderColor:'var(--color-border)'}}>
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold">Ekolayzer</h3>
            {currentTrack && (
              <button
                onClick={() => setPerTrackMode(!perTrackMode)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5", perTrackMode ? 'bg-primary text-white' : 'bg-white/5')}
              >
                <Music size={12} />
                <span>{perTrackMode ? 'Bu Parçaya Özel' : 'Genel'}</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleBypass}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5", effectsBypass ? 'bg-white/5 text-muted-foreground' : 'bg-primary/20 text-primary')}>
              <Power size={12} />
              <span>{effectsBypass ? 'Kapalı' : 'Aktif'}</span>
            </button>
            <button onClick={handleReset}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-primary/15 text-primary">
              <RotateCcw size={12} />
              <span>Varsayılana Çevir</span>
            </button>
            <button onClick={onClose} className="hover:text-primary transition"><X size={18} /></button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-border">
          {['eq', 'effects', 'presets'].map(tab => (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn("px-5 py-3 text-sm font-bold transition border-b-2", activeTab === tab ? 'text-primary border-primary' : 'text-muted-foreground border-transparent')}
            >
              {tab === 'eq' && 'EQ'}
              {tab === 'effects' && 'Ses Efektleri'}
              {tab === 'presets' && 'Presetler'}
            </button>
          ))}
        </div>
        
        <div className="p-5">
          {activeTab === 'eq' && (
            <>
              {/* EQ Sliders - Vertical (Y-axis) */}
              <div className="flex flex-row items-stretch justify-between mb-3 px-2 gap-0 overflow-x-auto custom-scrollbar" style={{backgroundColor:'rgba(255,255,255,0.03)', borderRadius:'12px', minWidth:'500px', height:'180px'}}>
                {equalizerBands.map((value, index) => (
                  <div key={index} className="flex-shrink-0 flex flex-col items-center py-2" style={{width: '50px', height:'100%'}}>
                    <div className="flex-1 flex flex-col items-center justify-center w-full" style={{height:'120px'}}>
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        step="0.5"
                        value={value}
                        onChange={(e) => setEqualizerBand(index, parseFloat(e.target.value))}
                        className="eq-slider"
                        style={{height:'110px', width:'24px'}}
                      />
                    </div>
                    <span className="text-[9px] mt-1 font-bold" style={{color: value > 0 ? 'var(--color-primary)' : 'var(--text-secondary)'}}>
                      {value > 0 ? `+${value}` : value}
                    </span>
                    <span className="text-[8px]" style={{color:'var(--text-secondary)'}}>{EQ_BANDS[index]}</span>
                  </div>
                ))}
              </div>
              
              {/* Frequency labels */}
              <div className="flex justify-between text-[10px] px-4 mb-4" style={{color:'var(--color-text-secondary)'}}>
                <span>Bas</span>
                <span>Mid</span>
                <span>Tiz</span>
              </div>
              
              {/* Preset chips */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {Object.keys(allPresets).map(name => (
                  <button key={name}
                    onClick={() => applyPreset(name)}
                    className={cn("px-3 py-1.5 rounded-r-lg text-xs font-bold transition border-l-4", selectedPreset === name ? 'bg-primary/18 text-primary border-primary pl-2.5' : 'bg-white/5 text-text-primary border-transparent pl-3')}
                  >
                    {name}
                  </button>
                ))}
              </div>
              
              {/* Per-track apply */}
              {currentTrack && (
                <button onClick={handleApplyToTrack}
                  className="flex flex-col w-full py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 bg-primary/10 text-primary">
                  <Music size={14} />
                  <span>Bu EQ Ayarlarını "{currentTrack.title}" Parçasına Kaydet</span>
                </button>
              )}
            </>
          )}
          
          {activeTab === 'effects' && (
            <div className="flex flex-col gap-5">
              {Object.entries(EQUALIZER_SETTINGS).map(([key, setting]) => (
                <div key={key} className="p-4 rounded-xl" style={{backgroundColor:'rgba(255,255,255,0.03)'}}>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <div className="text-sm font-bold">{setting.label}</div>
                      <div className="text-xs" style={{color:'var(--color-text-secondary)'}}>{setting.desc}</div>
                    </div>
                    <span className="text-sm font-bold" style={{color: audioEffects[key] > 50 ? 'var(--color-primary)' : 'var(--color-text-secondary)'}}>
                      {audioEffects[key]}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={setting.min}
                    max={setting.max}
                    value={audioEffects[key]}
                    onChange={(e) => setAudioEffect(key, parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              ))}
              
              {currentTrack && (
                <button
                  onClick={() => {
                    Object.keys(audioEffects).forEach(key => {
                      useStore.getState().setAudioEffect(key, audioEffects[key]);
                    });
                  }}
                  className="flex flex-col w-full py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 bg-primary/10 text-primary"
                >
                  <Music size={14} />
                  <span>Bu Efektleri Parçaya Kaydet</span>
                </button>
              )}
            </div>
          )}
          
          {activeTab === 'presets' && (
            <div className="flex flex-col gap-4">
              {/* Save new preset */}
              <div className="flex gap-2">
                <input
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                  placeholder="Yeni preset adı..."
                  className="flex-1 border rounded-lg px-4 py-2 text-sm"
                  style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--color-border)', color:'var(--color-text-primary)'}}
                />
                <button onClick={handleSavePreset} disabled={!newPresetName.trim()}
                  className="flex flex-col px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50 flex items-center gap-2 bg-primary">
                  <Save size={14} />
                  <span>Kaydet</span>
                </button>
              </div>
              
              {/* Built-in presets */}
              <div>
                <div className="text-xs font-bold mb-2 text-muted-foreground">Hazır Presetler</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(eqPresets).map(name => (
                    <button key={name}
                      onClick={() => applyPreset(name)}
                      className={cn("p-3 rounded-xl text-left transition text-sm font-bold", selectedPreset === name ? 'bg-primary/15 text-primary border border-primary' : 'bg-white/3 border border-transparent')}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Custom presets */}
              {Object.keys(customPresets).length > 0 && (
                <div>
                  <div className="text-xs font-bold mb-2 text-muted-foreground">Özel Presetlerin</div>
                  <div className="flex flex-col gap-1">
                    {Object.entries(customPresets).map(([name, bands]) => (
                      <div key={name} className="flex items-center justify-between p-3 rounded-xl" style={{backgroundColor:'rgba(255,255,255,0.03)'}}>
                        <button onClick={() => applyPreset(name)} className="text-sm font-bold flex-1 text-left">
                          {name}
                        </button>
                        <button onClick={() => deleteCustomPreset(name)} className="text-red-500 hover:text-red-400 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EqualizerModal;
