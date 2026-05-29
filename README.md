# Player 1.0.0

> *Müzik, video, ses... uygulaması. Pek çok özelliğiyle eklentiler ve yapay zeka. Sade bir arayüz ve kullanıcı dostu bir yapı benimsedim.*

**Player** — Windows için geliştirilmiş, modern arayüzlü, yerel medya oynatıcı. Müzik, video ve ses dosyalarını oynatır; eklenti sistemi ve AI entegrasyonu ile genişletilebilir.

---

## Özellikler

### 🎵 Medya Oynatma
- **Desteklenen Formatlar**: MP3, FLAC, WAV, M4A, OGG, AAC, WMA, MP4, MKV, AVI, WEBM
- **Video Oynatma**: Tam video desteği
- **Ses Görselleştirici**: 3D spektrum analizörü + dalga formu
- **10 Bantlı Ekolayzer**: Grafik ekolayzer ile ses profili oluşturma
- **Ses Efektleri**: Hız değiştirme, yankı, kompresör, filtreler
- **Altyazı Desteği**: SRT/VTT yükleme, zaman çizelgesinde takip, tıklayarak atlama

### 🤖 Yapay Zeka
- **AI Sohbet**: Eklenti oluşturmak için AI desteği (OpenRouter API)
- **AI Güvenlik Analizi**: Eklentileri yüklemeden önce AI ile analiz etme
- **AI Sağlayıcı**: OpenRouter, OpenAI, Anthropic, Google ve özel uç nokta desteği

### 🧩 Eklenti Sistemi
- **Eklenti Mağazası**: Keşfet, indir, kur
- **Eklenti Oluşturma**: AI sohbet ile eklenti geliştirme
- **GitHub Yayınlama**: Eklentileri doğrudan GitHub'a yayınlama
- **Güvenlik**: AI destekli güvenlik analizi, erişim seviyesi değerlendirmesi

### 🎨 Arayüz
- **Sade ve Modern**: Tailwind CSS ile temiz, minimal tasarım
- **Tamamen Türkçe**: Menüler, ayarlar, bildirimler
- **Koyu/Açık Tema**: İki tema seçeneği
- **Özelleştirilebilir Renk**: Vurgu rengi seçimi
- **Saydamlık Ayarı**: Pencere saydamlığı
- **Mini Mod**: Küçültülmüş pencere modu
- **Tam Ekran Medya**: Sadece medya içeriği ile tam ekran deneyimi

### 📂 Kütüphane Yönetimi
- Kategori bazlı müzik kütüphanesi
- Sürükle-bırak dosya ekleme
- YouTube URL'den müzik indirme (FFmpeg ile)
- Ses dosyası metaveri okuma (ID3 etiketleri)

### ⌨️ Kısayol Tuşları
- Boşluk: Oynat/Duraklat
- Ctrl+→ / ←: İleri/Geri
- Ctrl+↑ / ↓: Ses aç/kapa
- F11: Mini mod
- F: Tam ekran medya
- L: Altyazı paneli
- Escape: Tam ekrandan çık

---

## Kurulum

1. **Player Setup 1.0.0.exe** dosyasını çalıştırın
2. Kurulum sihirbazını takip edin
3. Uygulamayı başlatın

### Sistem Gereksinimleri

| Bileşen | Gereksinim |
|---------|------------|
| İşletim Sistemi | Windows 10/11 (64-bit) |
| RAM | En az 4 GB |
| Depolama | 500 MB boş alan |
| İsteğe Bağlı | FFmpeg (YouTube indirme) |

---

## Hızlı Başlangıç

```bash
# Uygulamayı açın
# Dosyaları sürükleyip bırakın veya "Aç" butonunu kullanın
# Çalmak istediğiniz şarkıya tıklayın
# Ekolayzer ve efektleri özelleştirin
# Eklentiler ile genişletin
# AI ile eklenti oluşturun
```

---

## Eklenti Geliştirme

Detaylı rehber: [EKLENTI_YAPMA.md](./EKLENTI_YAPMA.md)

Player, JavaScript tabanlı eklentileri destekler. Eklentiler;
- Yeni özellikler ekleyebilir
- Yeni sayfalar oluşturabilir
- Tema/skin değiştirebilir
- API entegrasyonları yapabilir

---

## Kullanım Kılavuzu

Detaylı kullanım: [KULLANIM_KILAVUZU.md](./KULLANIM_KILAVUZU.md)

---

## Teknolojiler

| Teknoloji | Amaç |
|-----------|------|
| Electron 28 | Masaüstü uygulama çatısı |
| React 19 | Kullanıcı arayüzü |
| Vite 8 | Derleme aracı |
| Tailwind CSS 4 | Stil çatısı |
| Zustand | Durum yönetimi |
| Tone.js | Ses işleme (ekolayzer/efektler) |
| Three.js | 3D görselleştirici |
| lunr.js | Yerel arama motoru |
| Wavesurfer.js | Dalga formu gösterimi |
| electron-builder | Windows installer |

---

## Vizyon

> *"It's a music, video, audio... application with many features like plugins and artificial intelligence. I've adopted a simple interface and user-friendly structure."*

Player, basit bir medya oynatıcı fikrinden doğdu. Zamanla eklenti sistemi, AI entegrasyonu ve görsel araçlarla zenginleşti. Ama özünde hep sade ve kullanıcı dostu kaldı.

---

## Lisans

© 2026 TARIK ELER — Tüm hakları saklıdır.

---

*Player — Müzik deneyiminizi yeniden tanımlayın.*
