import React from 'react';
import { X, Keyboard } from 'lucide-react';

const SHORTCUT_LIST = [
  { keys: ['Space'], label: 'Oynat / Duraklat' },
  { keys: ['←'], label: '5 saniye geri' },
  { keys: ['→'], label: '5 saniye ileri' },
  { keys: ['Shift', '←'], label: 'Önceki parça' },
  { keys: ['Shift', '→'], label: 'Sonraki parça' },
  { keys: ['↑'], label: 'Ses aç (+5)' },
  { keys: ['↓'], label: 'Ses kapat (-5)' },
  { keys: ['M'], label: 'Sessize al / Aç' },
  { keys: ['V'], label: 'Görselleştirici aç/kapat' },
  { keys: ['W'], label: 'Dalga formu aç/kapat' },
  { keys: ['C'], label: 'Şarkı sözleri aç/kapat' },
  { keys: ['F'], label: 'Tam ekran' },
  { keys: ['R'], label: 'Yeniden adlandır' },
  { keys: ['Delete'], label: 'Parçayı sil' },
  { keys: ['Esc'], label: 'Seçimi temizle' },
  { keys: ['?', 'F1'], label: 'Bu yardım paneli' },
];

const formatKey = (k) => (
  <kbd
    key={k}
    className="inline-block px-2 py-1 mx-0.5 rounded-lg text-xs font-mono font-bold"
    style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'var(--text-primary)', minWidth: '24px', textAlign: 'center' }}
  >
    {k}
  </kbd>
);

export default function ShortcutsHelp({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Klavye Kısayolları"
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl p-6 flex flex-col gap-5 custom-scrollbar"
        style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--border-color)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Keyboard size={24} style={{ color: 'var(--color-primary)' }} />
            <h2 className="text-xl font-bold">Klavye Kısayolları</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition"
            aria-label="Kapat"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Müzik çalarda gezinmek ve komutları çalıştırmak için bu kısayolları kullanın.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SHORTCUT_LIST.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl transition hover:bg-white/5"
              style={{ border: '1px solid var(--border-color)' }}
            >
              <span className="text-sm">{s.label}</span>
              <div className="flex items-center">
                {s.keys.map(formatKey)}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-center pt-2" style={{ color: 'var(--text-secondary)' }}>
          Kısayolları Ayarlar → Klavye Kısayolları'ndan özelleştirebilirsiniz.
        </div>
      </div>
    </div>
  );
}
