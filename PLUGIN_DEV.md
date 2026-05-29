# Player 1.0.0 — Eklenti Geliştirme Rehberi

Bu belge, Player 1.0.0 için eklenti (plugin) geliştirmek isteyen geliştiricilere yöneliktir.

## İçindekiler
1. [Giriş](#giriş)
2. [Eklenti Yapısı](#eklenti-yapısı)
3. [Eklenti API'si](#eklenti-apisı)
4. [Örnek Eklentiler](#örnek-eklentiler)
5. [Yayınlama](#yayınlama)
6. [İpuçları](#ipuçları)

---

## Giriş

Player 1.0.0, JavaScript modülleri olarak yazılan eklentileri destekler. Eklentiler, uygulamanın temel sistemleriyle entegre olarak yeni özellikler ekleyebilir.

### Temel Kavramlar

- **Eklenti (Plugin)**: Bağımsız bir JavaScript modülü
- **Aktivasyon**: Eklentinin yüklendiğinde çalıştırılan fonksiyon
- **Komut**: Eklentinin kaydettiği çağrılabilir işlevler
- **Olay (Event)**: Uygulama içinde gerçekleşen olaylar (şarkı değişimi, oynatma durumu vb.)

---

## Eklenti Yapısı

Bir eklenti klasörü şu şekilde görünür:

```
my-plugin/
├── package.json      # Eklenti bilgileri
├── index.js          # Ana kod
└── README.md         # Dokümantasyon (opsiyonel)
```

### package.json

```json
{
  "name": "player-plugin-ornek",
  "version": "1.0.0",
  "description": "Örnek Player eklentisi",
  "main": "index.js",
  "keywords": ["player-music", "plugin"],
  "author": "Adınız",
  "license": "MIT"
}
```

### index.js — Temel Yapı

```javascript
module.exports = {
  name: 'Benim Eklentim',
  version: '1.0.0',

  // Eklenti yüklendiğinde çağrılır
  activate(context) {
    console.log('Eklenti aktifleştirildi');
    
    // Komut kaydetme
    context.registerCommand('ornek.merhaba', () => {
      console.log('Eklentiden merhaba!');
    });
  },

  // Eklenti kaldırıldığında çağrılır
  deactivate() {
    console.log('Eklenti devre dışı');
  }
};
```

---

## Eklenti API'si

`activate()` fonksiyonuna geçilen `context` nesnesi, uygulama işlevlerine erişim sağlar.

### Komutlar

```javascript
// Komut kaydetme
context.registerCommand('eklenti.komutAdi', (args) => {
  // Komut mantığı
});

// Başka bir komutu çağırma
context.executeCommand('core.playTrack', { trackId: '123' });
```

### Olaylar (Events)

```javascript
// Olay dinleme
context.on('track:play', (track) => {
  console.log('Çalıyor:', track.title);
});

context.on('track:pause', () => {
  console.log('Duraklatıldı');
});

context.on('track:end', () => {
  console.log('Şarkı bitti');
});

context.on('library:update', (tracks) => {
  console.log('Kütüphane güncellendi:', tracks.length);
});
```

### Depolama

```javascript
// Veri kaydetme
context.storage.set('anahtar', { data: 'değer' });

// Veri okuma
const data = context.storage.get('anahtar');

// Temizleme
context.storage.clear();
```

### Arayüz Eklentileri

```javascript
// Menü öğesi ekleme
context.ui.addMenuItem({
  label: 'Eklenti İşlemi',
  action: () => {
    // İşlem mantığı
  }
});

// Bildirim gösterme
context.ui.showNotification({
  title: 'Eklenti Bildirimi',
  message: 'Bir şey oldu!',
  type: 'info' // 'info', 'success', 'warning', 'error'
});

// Ayarlar paneli ekleme
context.ui.addSettingsPanel({
  id: 'eklenti-ayarlarim',
  title: 'Eklenti Ayarlarım',
  render: (container) => {
    container.innerHTML = '<h3>Ayarlar</h3>';
  }
});
```

### Kütüphane Erişimi

```javascript
// Tüm şarkıları alma
const tracks = context.library.getTracks();

// ID ile şarkı bulma
const track = context.library.getTrack('track-id');

// Şarkı ekleme
context.library.addTrack({
  title: 'Yeni Şarkı',
  artist: 'Sanatçı Adı',
  location: 'C:/Müzik/sarki.mp3'
});

// Şarkı güncelleme
context.library.updateTrack('track-id', {
  title: 'Güncellenmiş Başlık'
});

// Şarkı silme
context.library.removeTrack('track-id');
```

### Oynatıcı Kontrolü

```javascript
// Oynat/duraklat
context.player.togglePlay();

// İleri/geri
context.player.next();
context.player.previous();

// Konumlandırma (saniye)
context.player.seek(30);

// Ses seviyesi (0-100)
context.player.setVolume(75);

// Güncel şarkı
const current = context.player.getCurrentTrack();

// Oynatma durumu
const state = context.player.getState();
// { isPlaying, currentTrack, progress, duration, volume }
```

---

## Örnek Eklentiler

### Şarkı Sözü Getirici

```javascript
module.exports = {
  name: 'Şarkı Sözü Getirici',
  version: '1.0.0',

  activate(context) {
    context.registerCommand('sozler.fetch', async (track) => {
      const sozler = await this.fetchLyrics(track);
      if (sozler) {
        context.library.updateTrack(track.id, { lyrics: sozler });
        context.ui.showNotification({
          title: 'Şarkı Sözü Bulundu',
          message: `"${track.title}" için sözler yüklendi`,
          type: 'success'
        });
      }
    });

    context.on('track:play', (track) => {
      if (!track.lyrics) {
        context.executeCommand('sozler.fetch', track);
      }
    });
  },

  async fetchLyrics(track) {
    const res = await fetch(
      `https://api.lyrics.ovh/v1/${track.artist}/${track.title}`
    );
    const data = await res.json();
    return data.lyrics;
  },

  deactivate() {}
};
```

### Akıllı Çalma Listesi Oluşturucu

```javascript
module.exports = {
  name: 'Akıllı Liste',
  version: '1.0.0',

  activate(context) {
    context.ui.addMenuItem({
      label: 'Akıllı Çalma Listesi Oluştur',
      action: () => {
        const tracks = context.library.getTracks();
        const yeniEklenenler = tracks
          .filter(t => Date.now() - t.addedAt < 7 * 24 * 60 * 60 * 1000)
          .sort((a, b) => b.addedAt - a.addedAt)
          .slice(0, 50);

        context.library.createPlaylist({
          name: 'Bu Hafta Eklenenler',
          tracks: yeniEklenenler.map(t => t.id)
        });
      }
    });
  },

  deactivate() {}
};
```

---

## Yayınlama

### GitHub ile

1. GitHub'da bir repo oluşturun
2. Eklenti kodunuzu push edin
3. Sürüm etiketi ekleyin: `git tag v1.0.0 && git push --tags`
4. Player uygulaması içinden "Eklentiler > GitHub'dan Yükle" ile ekleyin

### npm ile

```bash
npm publish
```

Ardından Player ayarlarından "npm Paketi Ekle" ile yükleyin.

### Yerel Yükleme

Eklenti klasörünü doğrudan `%APPDATA%/player-music/plugins/` altına kopyalayın.

---

## İpuçları

1. **Performans**: Eklentilerinizi hafif tutun, bloke edici işlemlerden kaçının
2. **Hata Yönetimi**: Async işlemleri her zaman try-catch ile sarın
3. **Temizlik**: `deactivate()` içinde kaynakları temizleyin (zamanlayıcılar, event listener'lar)
4. **Adlandırma**: Komut adlarında eklenti adını ön ek olarak kullanın (örn. `benimeklentim.komut`)
5. **Dokümantasyon**: README.md ekleyin
6. **Test**: Farklı dosya türleri ve uç durumlarla test edin

### Güvenlik

- Eklentiler tam Node.js erişimine sahiptir
- Sadece güvendiğiniz kaynaklardan eklenti yükleyin
- Eklenti kodunu yüklemeden önce gözden geçirin
- Eklentiler dosya sistemine ve ağa erişebilir

---

## Detaylı Referans

İngilizce detaylı eklenti geliştirme rehberi için:
[docs/plugin-skills.md](./docs/plugin-skills.md)

Yukarıdaki belgede şunları bulabilirsiniz:
- Komut ve olay API referansı
- Last.fm Scrobbler örneği
- Şarkı Sözü Getirici örneği
- Akıllı Çalma Listesi örneği
- Sorun giderme
- Yayınlama talimatları

---

## Destek

Sorularınız veya önerileriniz için:
- GitHub: https://github.com/TARIKELER/player-music
- E-posta: proje sayfasındaki iletişim bilgileri

---

*Player 1.0.0 — Müzik deneyiminizi kodla genişletin.*
