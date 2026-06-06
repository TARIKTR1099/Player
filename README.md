# Player 1.0.0

> *Müzik, video, ses... uygulaması. Pek çok özelliğiyle eklentiler ve yapay zeka. Sade bir arayüz ve kullanıcı dostu bir yapı benimsedim.*

**Player** — Modern, çapraz platform medya oynatıcı. Müzik, video ve ses dosyalarını oynatır; eklenti sistemi ve AI entegrasyonu ile genişletilebilir.

---

## ⬇️ İndir

[![Release](https://img.shields.io/github/v/release/TARIKTR1099/Player?include_prereleases&style=flat-square)](https://github.com/TARIKTR1099/Player/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/TARIKTR1099/Player/total?style=flat-square)](https://github.com/TARIKTR1099/Player/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Android%20%7C%20iOS-blue?style=flat-square)]()

### [👉 Son sürümü indir (v1.0.0)](https://github.com/TARIKTR1099/Player/releases/latest)

| Platform | Mimari | İndirme Linki |
|----------|--------|---------------|
| **Windows** | x86-64 (Setup) | [Player-1.0.0-setup-x64.exe](https://github.com/TARIKTR1099/Player/releases/download/v1.0.0/Player-1.0.0-setup-x64.exe) (106 MB) |
| **Windows** | x86-64 (Portable) | [Player-1.0.0-portable-x64.exe](https://github.com/TARIKTR1099/Player/releases/download/v1.0.0/Player-1.0.0-portable-x64.exe) (94 MB) |
| **Windows** | x86-64 (Raw) | [Player-1.0.0-x64.exe](https://github.com/TARIKTR1099/Player/releases/download/v1.0.0/Player-1.0.0-x64.exe) (238 MB) |
| **Windows** | x86-32 | [Player-1.0.0-ia32.exe](https://github.com/TARIKTR1099/Player/releases/download/v1.0.0/Player-1.0.0-ia32.exe) (229 MB) |
| **Linux** | x86-64 (AppImage) | [Player-1.0.0-linux-x86_64.AppImage](https://github.com/TARIKTR1099/Player/releases/download/v1.0.0/Player-1.0.0-linux-x86_64.AppImage) (347 MB) |
| **macOS** | x86-64 + ARM64 | [Kaynak kodu indir → kendin derle](#kaynak-koddan-derleme) |
| **Android** | ARM64 + ARMv7 | [Kaynak kodu indir → kendin derle](#kaynak-koddan-derleme) |
| **iOS** | ARM64 | [Kaynak kodu indir → kendin derle](#kaynak-koddan-derleme) |

#### Kaynak Koddan Derleme

```bash
# Kaynak arşivi (zip / tar.gz)
# Player-1.0.0-source.zip
# Player-1.0.0-source.tar.gz

unzip Player-1.0.0-source.zip   # veya tar -xzf Player-1.0.0-source.tar.gz
cd Player-1.0.0
npm install
npm run build:mac       # macOS DMG
npm run build:linux     # Linux AppImage/deb/rpm
cd mobile && npx cap sync android ios
```

**Sistem Gereksinimleri**: Node.js ≥ 20, npm ≥ 10, macOS için Xcode 15+, Android için Android Studio + SDK 34+.

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
- C: Altyazı aç/kapa (YouTube tarzı)
- L: Altyazı paneli
- Escape: Tam ekrandan çık

### 🆕 Son Eklenen Özellikler
- **Uyku Zamanlayıcısı**: Belirli dakika sonra otomatik duraklatma
- **Ses Boost**: %100-%200 arası ses artırma (kırmızı gösterge)
- **Otomatik Bypass**: EQ ve efektler 0'dayken ses işleme devre dışı (kalite artışı)
- **Geri Dönüşüm Silme**: Sağ tık > Sil dosyayı geri dönüşüme gönderir
- **Daraltılabilir Playlist**: Çalışma listesi küçültülüp büyütülebilir
- **Global Görselleştirici**: Tüm sekmelerde ses dalgası/spektrum görünür

---

## Kurulum

1. **Player Setup 1.0.0.exe** dosyasını çalıştırın
2. Kurulum sihirbazını takip edin
3. Uygulamayı başlatın

### Sistem Gereksinimleri

| Bileşen | Gereksinim |
|---------|------------|
| İşletim Sistemi | Windows 10/11, macOS 10.15+, Linux (Ubuntu 20.04+/Fedora 38+) |
| RAM | En az 4 GB |
| Depolama | 500 MB boş alan |
| İsteğe Bağlı | FFmpeg (YouTube indirme), git, Node.js 18+ (geliştirme) |

---

## 🔧 Platformlar Arası Derleme

Player **Windows**, **macOS**, **Linux**, **Android** ve **iOS** için derlenebilir.

```bash
# Bağımlılıkları yükle
npm install

# Web derlemesi
npm run build-web

# ── Windows ──
npm run build                    # NSIS installer (x64 + ia32)
npm run build:win:portable       # Portable executable (x64)
npm run build:win:zip            # ZIP archive (x64)
# Çıktı: dist/Player-{version}-x64.exe

# ── macOS ──
npm run build:mac                # DMG + ZIP (x64)
npm run build:mac:arm            # Apple Silicon (ARM64)
npm run build:mac:zip            # ZIP only (x64)
# Çıktı: dist/Player-{version}-mac-{arch}.dmg

# ── Linux ──
npm run build:linux              # AppImage + deb + rpm (x64)
npm run build:linux:appimage     # Sadece AppImage
npm run build:linux:deb          # Sadece Debian/Ubuntu paketi
npm run build:linux:rpm          # Sadece Fedora/RHEL paketi
# Çıktı: dist/Player-{version}-linux-{arch}.AppImage

# ── Tümü ──
npm run build:all:desktop        # Win + Mac + Linux
npm run build:all                # Tüm platformlar + tüm hedefler
npm run release                  # Build + GitHub'a yükle

# ── Android ──
npm run mobile:init              # Capacitor bağımlılıklarını yükle
npm run mobile:android           # Android Studio ile aç
# Not: Android SDK kurulu olmalı

# ── iOS ──
npm run mobile:init              # Capacitor bağımlılıklarını yükle
npm run mobile:ios               # Xcode ile aç
# Not: macOS + Xcode gerekli

# ── Geliştirme ──
npm run start:dev                # Vite HMR + Electron canlı yeniden yükleme
```

### macOS İmzalama (Noterizasyon)

macOS dağıtımı için Apple Developer hesabı gerekir:

```bash
export APPLE_ID="ornek@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="TEAMID"
npm run build:mac
```

### Platform Mimarisi

| Mimarî | Windows | macOS | Linux | Android | iOS |
|--------|---------|-------|-------|---------|-----|
| x86-64 | ✅ NSIS | ✅ DMG/ZIP | ✅ AppImage/deb/rpm | — | — |
| ARM64  | — | ✅ DMG/ZIP | ✅ AppImage/deb | ✅ | ✅ |
| x86-32 | ✅ NSIS | — | — | — | — |

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
| electron-builder | Cross-platform installer (Win/Mac/Linux) |
| Capacitor | Android/iOS mobil sarmalayıcı |

---

## Vizyon

> *"It's a music, video, audio... application with many features like plugins and artificial intelligence. I've adopted a simple interface and user-friendly structure."*

Player, basit bir medya oynatıcı fikrinden doğdu. Zamanla eklenti sistemi, AI entegrasyonu ve görsel araçlarla zenginleşti. Ama özünde hep sade ve kullanıcı dostu kaldı.

---

## Lisans

© 2026 TARIK ELER — Tüm hakları saklıdır.

---

*Player — Müzik deneyiminizi yeniden tanımlayın.*
