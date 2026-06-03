import React, { useState, useRef, useEffect } from 'react';
import { X, Image, Volume2, Map, Upload, Music, Sliders, RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Crop, ZoomIn, Palette, Layers, TextSelect, Video, Film, Timer, Subtitles, RefreshCw, Trash2, Eye } from 'lucide-react';
import { useStore } from '../store';

const VIDEO_TABS = ['temel', 'renk', 'geometri', 'ozel', 'overlay', 'gelismis'];
const VIDEO_TAB_LABELS = { temel: 'Temel', renk: 'Renk', geometri: 'Geometri', ozel: 'Özel Efektler', overlay: 'Kaplama', gelismis: 'Gelişmiş' };
const VIDEO_TAB_ICONS = { temel: Sliders, renk: Palette, geometri: Crop, ozel: Video, overlay: Layers, gelismis: Film };

const SectionLabel = ({ label }) => (
  <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-secondary)' }}>{label}</div>
);

const EffectSlider = ({ label, value, min, max, step, onChange, unit, icon: Icon }) => (
  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-2">
        {Icon && <Icon size={14} style={{ color: 'var(--color-text-secondary)' }} />}
        <span className="text-xs font-bold">{label}</span>
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color: value > (max / 2) ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
        {value}{unit || ''}
      </span>
    </div>
    <input type="range" min={min} max={max} step={step || 1} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full" />
  </div>
);

const EffectToggle = ({ label, enabled, onChange, icon: Icon }) => (
  <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
    <div className="flex items-center space-x-2">
      {Icon && <Icon size={14} style={{ color: 'var(--color-text-secondary)' }} />}
      <span className="text-xs font-bold">{label}</span>
    </div>
    <button onClick={() => onChange(!enabled)}
      className={`w-10 h-5 rounded-full transition relative ${enabled ? 'bg-blue-500' : 'bg-gray-600'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform shadow ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

const EffectButton = ({ label, active, onClick, icon: Icon }) => (
  <button onClick={onClick}
    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition"
    style={active ? { backgroundColor: 'var(--color-primary)', color: 'white' } : { backgroundColor: 'rgba(255,255,255,0.05)' }}
  >
    {Icon && <Icon size={12} />}
    <span>{label}</span>
  </button>
);

const EffectsModal = ({ onClose }) => {
  const [mainTab, setMainTab] = useState('video');
  const [videoTab, setVideoTab] = useState('temel');
  const { videoEffects, setVideoEffect, setVideoEffectsBulk, audioV2, setAudioV2Node, mapping, setMapping, setSubtitleTracks, setActiveSubtitle, currentTrack } = useStore();
  const fileInputRef = useRef(null);
  const subtitleInputRef = useRef(null);

  const handleVideoSlider = (key) => (value) => setVideoEffect(key, value);

  const handleToggle = (key) => (value) => setVideoEffect(key, value);

  const renderVideoTab = () => {
    switch (videoTab) {
      case 'temel':
        return (
          <div className="space-y-3">
            <SectionLabel label="Parlaklık & Kontrast" />
            <EffectSlider label="Parlaklık" value={videoEffects.brightness} min={0} max={200} onChange={handleVideoSlider('brightness')} unit="%" icon={Sun} />
            <EffectSlider label="Kontrast" value={videoEffects.contrast} min={0} max={200} onChange={handleVideoSlider('contrast')} unit="%" icon={Contrast} />
            <EffectSlider label="Doygunluk" value={videoEffects.saturation} min={0} max={200} onChange={handleVideoSlider('saturation')} unit="%" />
            <EffectSlider label="Gamma" value={videoEffects.gamma} min={0} max={200} onChange={handleVideoSlider('gamma')} unit="%" />
            <EffectSlider label="Keskinlik" value={videoEffects.sharpness} min={0} max={100} onChange={handleVideoSlider('sharpness')} unit="%" />
            <EffectSlider label="Hareket Bulanıklığı" value={videoEffects.motionBlur} min={0} max={100} onChange={handleVideoSlider('motionBlur')} unit="%" />
          </div>
        );
      case 'renk':
        return (
          <div className="space-y-3">
            <SectionLabel label="Renk Araçları" />
            <EffectSlider label="Threshold (Eşik)" value={videoEffects.threshold} min={0} max={255} onChange={handleVideoSlider('threshold')} />
            <EffectSlider label="Posterize" value={videoEffects.posterize} min={0} max={8} step={1} onChange={handleVideoSlider('posterize')} />
            <EffectToggle label="Eski Fotoğraf" enabled={videoEffects.oldPhoto} onChange={handleToggle('oldPhoto')} icon={Camera} />
          </div>
        );
      case 'geometri':
        return (
          <div className="space-y-3">
            <SectionLabel label="Kırpma" />
            <EffectSlider label="Üst" value={videoEffects.cropTop} min={0} max={50} onChange={handleVideoSlider('cropTop')} unit="%" />
            <EffectSlider label="Alt" value={videoEffects.cropBottom} min={0} max={50} onChange={handleVideoSlider('cropBottom')} unit="%" />
            <EffectSlider label="Sol" value={videoEffects.cropLeft} min={0} max={50} onChange={handleVideoSlider('cropLeft')} unit="%" />
            <EffectSlider label="Sağ" value={videoEffects.cropRight} min={0} max={50} onChange={handleVideoSlider('cropRight')} unit="%" />
            
            <SectionLabel label="Döndürme & Çevirme" />
            <div className="flex gap-2">
              <EffectButton label="0°" active={videoEffects.rotate === 0} onClick={() => setVideoEffect('rotate', 0)} />
              <EffectButton label="90°" active={videoEffects.rotate === 90} onClick={() => setVideoEffect('rotate', 90)} />
              <EffectButton label="180°" active={videoEffects.rotate === 180} onClick={() => setVideoEffect('rotate', 180)} />
              <EffectButton label="270°" active={videoEffects.rotate === 270} onClick={() => setVideoEffect('rotate', 270)} />
            </div>
            <div className="flex gap-2">
              <EffectButton label="Çevir Y" active={videoEffects.flipH} onClick={() => setVideoEffect('flipH', !videoEffects.flipH)} icon={FlipHorizontal} />
              <EffectButton label="Çevir X" active={videoEffects.flipV} onClick={() => setVideoEffect('flipV', !videoEffects.flipV)} icon={FlipVertical} />
            </div>
            
            <SectionLabel label="Yakınlaştırma" />
            <EffectSlider label="Zoom" value={videoEffects.zoom} min={50} max={200} onChange={handleVideoSlider('zoom')} unit="%" />
            
            <SectionLabel label="Bölme & Bulmaca" />
            <EffectSlider label="Izgara (Tiles)" value={videoEffects.tiles} min={0} max={8} step={1} onChange={handleVideoSlider('tiles')} />
            <EffectSlider label="Bulmaca (Puzzle)" value={videoEffects.puzzle} min={0} max={8} step={1} onChange={handleVideoSlider('puzzle')} />
          </div>
        );
      case 'ozel':
        return (
          <div className="space-y-3">
            <SectionLabel label="Özel Efektler" />
            <EffectToggle label="Psychedelic Dalgalar" enabled={videoEffects.psychedelic} onChange={handleToggle('psychedelic')} icon={Waves} />
            <EffectToggle label="Su Dalgası" enabled={videoEffects.waterRipple} onChange={handleToggle('waterRipple')} icon={Droplets} />
            <EffectToggle label="3D Anaglyph" enabled={videoEffects.anaglyph} onChange={handleToggle('anaglyph')} icon={Glasses} />
          </div>
        );
      case 'overlay':
        return (
          <div className="space-y-3">
            <SectionLabel label="Logo Kaplama" />
            <div className="flex gap-2">
              <button onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center space-x-2 p-4 rounded-xl border-2 border-dashed text-xs font-bold"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <Upload size={16} />
                <span>{videoEffects.logoImage ? 'Logo Değiştir' : 'Logo Yükle'}</span>
              </button>
              {videoEffects.logoImage && (
                <button onClick={() => setVideoEffect('logoImage', null)}
                  className="p-4 rounded-xl text-xs font-bold text-red-500"
                  style={{ backgroundColor: 'rgba(255,0,0,0.1)' }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setVideoEffect('logoImage', ev.target?.result);
                  reader.readAsDataURL(file);
                }
              }}
            />
            {videoEffects.logoImage && (
              <>
                <EffectSlider label="Logo Opaklığı" value={videoEffects.logoOpacity} min={0} max={100} onChange={handleVideoSlider('logoOpacity')} unit="%" />
                <EffectSlider label="Logo Boyutu" value={videoEffects.logoSize} min={5} max={50} onChange={handleVideoSlider('logoSize')} unit="%" />
                <EffectSlider label="Logo X" value={videoEffects.logoX} min={0} max={100} onChange={handleVideoSlider('logoX')} unit="%" />
                <EffectSlider label="Logo Y" value={videoEffects.logoY} min={0} max={100} onChange={handleVideoSlider('logoY')} unit="%" />
              </>
            )}
            
            <div className="h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            
            <SectionLabel label="Metin Kaplama" />
            <input value={videoEffects.textContent} onChange={(e) => setVideoEffect('textContent', e.target.value)}
              placeholder="Metin içeriği..."
              className="w-full border rounded-lg px-3 py-2 text-xs mb-3"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <EffectSlider label="Metin Boyutu" value={videoEffects.textSize} min={10} max={72} onChange={handleVideoSlider('textSize')} unit="px" />
            <EffectSlider label="Metin X" value={videoEffects.textX} min={0} max={100} onChange={handleVideoSlider('textX')} unit="%" />
            <EffectSlider label="Metin Y" value={videoEffects.textY} min={0} max={100} onChange={handleVideoSlider('textY')} unit="%" />
            <div className="flex items-center space-x-2">
              <span className="text-xs">Renk:</span>
              <input type="color" value={videoEffects.textColor} onChange={(e) => setVideoEffect('textColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
            </div>
          </div>
        );
      case 'gelismis':
        return (
          <div className="space-y-3">
            <SectionLabel label="Gelişmiş Efektler" />
            <EffectSlider label="Hareket Bulanıklığı" value={videoEffects.motionBlur} min={0} max={100} onChange={handleVideoSlider('motionBlur')} unit="%" />
          </div>
        );
      default:
        return null;
    }
  };

  const renderAudioTab = () => (
    <div className="space-y-3">
      <SectionLabel label="Kompresör" />
      <EffectToggle label="Kompresör" enabled={audioV2.compressor.threshold > -60} onChange={(v) => setAudioV2Node('compressor', 'threshold', v ? -24 : -60)} />
      {audioV2.compressor.threshold > -60 && (
        <>
          <EffectSlider label="Threshold" value={audioV2.compressor.threshold} min={-60} max={0} step={1} onChange={(v) => setAudioV2Node('compressor', 'threshold', v)} unit="dB" />
          <EffectSlider label="Ratio" value={audioV2.compressor.ratio} min={1} max={20} step={0.5} onChange={(v) => setAudioV2Node('compressor', 'ratio', v)} />
          <EffectSlider label="Knee" value={audioV2.compressor.knee} min={0} max={40} step={1} onChange={(v) => setAudioV2Node('compressor', 'knee', v)} unit="dB" />
          <EffectSlider label="Attack" value={audioV2.compressor.attack} min={0.001} max={0.1} step={0.001} onChange={(v) => setAudioV2Node('compressor', 'attack', v)} unit="s" />
          <EffectSlider label="Release" value={audioV2.compressor.release} min={0.01} max={1} step={0.01} onChange={(v) => setAudioV2Node('compressor', 'release', v)} unit="s" />
          <EffectSlider label="Makeup Gain" value={audioV2.compressor.makeupGain} min={0} max={24} step={0.5} onChange={(v) => setAudioV2Node('compressor', 'makeupGain', v)} unit="dB" />
        </>
      )}
      
      <div className="h-px" style={{ backgroundColor: 'var(--color-border)' }} />
      
      <SectionLabel label="Spatial Audio" />
      <EffectToggle label="Spatial Audio" enabled={audioV2.spatial.enabled} onChange={(v) => setAudioV2Node('spatial', 'enabled', v)} />
      {audioV2.spatial.enabled && (
        <>
          <EffectSlider label="Pozisyon X" value={audioV2.spatial.positionX} min={-10} max={10} step={0.1} onChange={(v) => setAudioV2Node('spatial', 'positionX', v)} />
          <EffectSlider label="Pozisyon Y" value={audioV2.spatial.positionY} min={-10} max={10} step={0.1} onChange={(v) => setAudioV2Node('spatial', 'positionY', v)} />
          <EffectSlider label="Pozisyon Z" value={audioV2.spatial.positionZ} min={-10} max={10} step={0.1} onChange={(v) => setAudioV2Node('spatial', 'positionZ', v)} />
          <EffectSlider label="Reverb Mix" value={audioV2.spatial.reverbMix} min={0} max={100} step={1} onChange={(v) => setAudioV2Node('spatial', 'reverbMix', v)} unit="%" />
          <EffectSlider label="Koni İç Açı" value={audioV2.spatial.coneInnerAngle} min={0} max={360} step={1} onChange={(v) => setAudioV2Node('spatial', 'coneInnerAngle', v)} />
          <EffectSlider label="Koni Dış Açı" value={audioV2.spatial.coneOuterAngle} min={0} max={360} step={1} onChange={(v) => setAudioV2Node('spatial', 'coneOuterAngle', v)} />
        </>
      )}
      
      <div className="h-px" style={{ backgroundColor: 'var(--color-border)' }} />
      
      <SectionLabel label="Delay / Echo" />
      <EffectToggle label="Delay / Echo" enabled={audioV2.delay.enabled} onChange={(v) => setAudioV2Node('delay', 'enabled', v)} />
      {audioV2.delay.enabled && (
        <>
          <EffectSlider label="Zaman" value={audioV2.delay.time} min={0.01} max={2} step={0.01} onChange={(v) => setAudioV2Node('delay', 'time', v)} unit="s" />
          <EffectSlider label="Feedback" value={audioV2.delay.feedback} min={0} max={0.99} step={0.01} onChange={(v) => setAudioV2Node('delay', 'feedback', v)} />
          <EffectSlider label="Wet/Dry" value={audioV2.delay.wetDry} min={0} max={1} step={0.01} onChange={(v) => setAudioV2Node('delay', 'wetDry', v)} />
        </>
      )}
      
      <div className="h-px" style={{ backgroundColor: 'var(--color-border)' }} />
      
      <SectionLabel label="Expander" />
      <EffectToggle label="Expander" enabled={audioV2.expander.enabled} onChange={(v) => setAudioV2Node('expander', 'enabled', v)} />
      {audioV2.expander.enabled && (
        <>
          <EffectSlider label="Threshold" value={audioV2.expander.threshold} min={-60} max={0} step={1} onChange={(v) => setAudioV2Node('expander', 'threshold', v)} unit="dB" />
          <EffectSlider label="Ratio" value={audioV2.expander.ratio} min={1} max={10} step={0.5} onChange={(v) => setAudioV2Node('expander', 'ratio', v)} />
          <EffectSlider label="Attack" value={audioV2.expander.attack} min={0.001} max={0.1} step={0.001} onChange={(v) => setAudioV2Node('expander', 'attack', v)} unit="s" />
          <EffectSlider label="Release" value={audioV2.expander.release} min={0.01} max={1} step={0.01} onChange={(v) => setAudioV2Node('expander', 'release', v)} unit="s" />
        </>
      )}
    </div>
  );

  const renderMappingTab = () => {
    return (
      <div className="space-y-3">
        <SectionLabel label="AV Senkronizasyon" />
        <div className="flex items-center space-x-2 p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
          <Timer size={14} style={{ color: 'var(--color-text-secondary)' }} />
          <span className="text-xs font-bold">Ses Kaydırma:</span>
          <span className="text-xs font-bold tabular-nums" style={{ color: mapping.avSyncOffset !== 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
            {mapping.avSyncOffset}ms
          </span>
        </div>
        <EffectSlider label="AV Sync Offset" value={mapping.avSyncOffset} min={-5000} max={5000} step={10} onChange={(v) => setMapping('avSyncOffset', v)} unit="ms" />
        
        <div className="h-px" style={{ backgroundColor: 'var(--color-border)' }} />
        
        <SectionLabel label="Altyazı" />
        <div className="flex gap-2">
          <button onClick={() => subtitleInputRef.current?.click()}
            className="flex-1 flex items-center justify-center space-x-2 p-4 rounded-xl border-2 border-dashed text-xs font-bold"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Upload size={16} />
            <span>{mapping.subtitleTracks.length > 0 ? 'Altyazı Ekle' : 'SRT/VTT Yükle'}</span>
          </button>
        </div>
        <input ref={subtitleInputRef} type="file" accept=".srt,.vtt,.ass" className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => {
                const content = ev.target?.result;
                if (typeof content === 'string') {
                  const parsed = parseSubtitle(content, file.name);
                  setSubtitleTracks([...mapping.subtitleTracks, parsed]);
                  setActiveSubtitle(parsed.id);
                }
              };
              reader.readAsText(file);
            }
          }}
        />
        
        {mapping.subtitleTracks.length > 0 && (
          <>
            <div className="space-y-1">
              {mapping.subtitleTracks.map((track) => (
                <div key={track.id}
                  onClick={() => setActiveSubtitle(track.id)}
                  className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-xs font-bold transition"
                  style={mapping.activeSubtitle === track.id ? { backgroundColor: 'rgba(15,108,189,0.15)', color: 'var(--color-primary)' } : { backgroundColor: 'rgba(255,255,255,0.03)' }}
                >
                  <div className="flex items-center space-x-2">
                    <Subtitles size={14} />
                    <span>{track.name}</span>
                  </div>
                  {mapping.activeSubtitle === track.id && <Eye size={14} />}
                </div>
              ))}
            </div>
            
            <SectionLabel label="Altyazı Ayarları" />
            <EffectSlider label="Zaman Kaydırma" value={mapping.subtitleOffset} min={-10000} max={10000} step={50} onChange={(v) => setMapping('subtitleOffset', v)} unit="ms" />
            <EffectSlider label="Boyut" value={mapping.subtitleSize} min={50} max={200} onChange={(v) => setMapping('subtitleSize', v)} unit="%" />
            <div className="flex items-center space-x-2 p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <span className="text-xs">Renk:</span>
              <input type="color" value={mapping.subtitleColor} onChange={(e) => setMapping('subtitleColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="rounded-2xl w-full max-w-[700px] mx-4 max-h-[85vh] overflow-y-auto border shadow-2xl custom-scrollbar"
        style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-xl font-bold">Efektler</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const store = useStore.getState();
                store.resetAllEffects();
              }}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition hover:opacity-80"
              style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
              title="Tüm efektleri sıfırla"
            >
              <RotateCcw size={13} />
              <span>Sıfırla</span>
            </button>
            <button onClick={onClose} className="hover:text-primary transition"><X size={18} /></button>
          </div>
        </div>

        <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
          {[
            { id: 'video', label: 'Görüntü', icon: Image },
            { id: 'audio', label: 'Ses', icon: Volume2 },
            { id: 'mapping', label: 'Eşleme', icon: Map },
          ].map((tab) => (
            <button key={tab.id}
              onClick={() => setMainTab(tab.id)}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-bold transition border-b-2"
              style={{
                color: mainTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                borderColor: mainTab === tab.id ? 'var(--color-primary)' : 'transparent'
              }}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4">
          {mainTab === 'video' && (
            <div className="flex gap-4">
              <div className="w-32 flex-shrink-0 space-y-1">
                {VIDEO_TABS.map((tab) => {
                  const Icon = VIDEO_TAB_ICONS[tab];
                  return (
                    <button key={tab}
                      onClick={() => setVideoTab(tab)}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold transition"
                      style={videoTab === tab ? { backgroundColor: 'var(--color-primary)', color: 'white' } : { color: 'var(--color-text-secondary)' }}
                    >
                      <Icon size={14} />
                      <span>{VIDEO_TAB_LABELS[tab]}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex-1 min-w-0">
                {renderVideoTab()}
              </div>
            </div>
          )}
          {mainTab === 'audio' && renderAudioTab()}
          {mainTab === 'mapping' && renderMappingTab()}
        </div>
      </div>
    </div>
  );
};

const Sun = (props) => <Sliders {...props} />;
const Contrast = (props) => <Sliders {...props} />;
const Camera = (props) => <Video {...props} />;
const Waves = (props) => <RefreshCw {...props} />;
const Droplets = (props) => <RotateCcw {...props} />;
const Glasses = (props) => <Eye {...props} />;

function parseSubtitle(content, filename) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const cues = [];
  let current = null;
  let id = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current) {
        cues.push({ ...current, id: id++ });
        current = null;
      }
      continue;
    }
    if (current && current.text !== undefined) {
      current.text += '\n' + trimmed;
      continue;
    }
    if (!current) {
      const timeMatch = trimmed.match(/(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/);
      if (timeMatch) {
        current = {
          start: parseTime(timeMatch[1]),
          end: parseTime(timeMatch[2]),
          text: ''
        };
        continue;
      }
      if (/^\d+$/.test(trimmed)) continue;
    }
  }
  if (current) cues.push({ ...current, id: id++ });

  return { id: `sub-${Date.now()}`, name: filename, cues, _raw: content };
}

function parseTime(str) {
  const parts = str.replace(',', '.').split(/[:.]/);
  return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]) + parseInt(parts[3] || '0') / 1000;
}

export default EffectsModal;
