# Player v1.0.0 — Çapraz Platform Medya Oynatıcı

Modern, sade ve tamamen Türkçe + İngilizce arayüzlü medya oynatıcı. Müzik, video, altyazı, eklenti sistemi ve yapay zeka entegrasyonu.

> 🎉 **İlk kararlı sürüm.** Tüm platformlar için derlenmiş binary'ler aşağıda.

---

## ⬇️ Download Page

| İşletim Sistemi | Tip | Dosya | Boyut |
|-----------------|-----|-------|-------|
| 🪟 **Windows** | x86-64 (Setup installer — NSIS) | `Player-1.0.0-setup-x64.exe` | 106 MB |
| 🪟 **Windows** | x86-64 (Portable — kurulum gerektirmez) | `Player-1.0.0-portable-x64.exe` | 94 MB |
| 🐧 **Linux** | x86-64 (AppImage — tüm dağıtımlar) | `Player-1.0.0-linux-x86_64.AppImage` | — |
| 🐧 **Linux** | x86-64 (Debian / Ubuntu .deb) | `Player-1.0.0-linux-amd64.deb` | — |
| 🐧 **Linux** | x86-64 (Fedora / RHEL .rpm) | `Player-1.0.0-linux-x86_64.rpm` | — |
| 🍎 **macOS** | Intel (x64) DMG | `Player-1.0.0-x64.dmg` | — |
| 🍎 **macOS** | Apple Silicon (arm64) DMG | `Player-1.0.0-arm64.dmg` | — |
| 🤖 **Android** | ARM (APK, debug-signed) | `player-1.0.0.apk` | — |
| 🍎 **iOS** | ARM64 (xcodebuild archive) | `player-1.0.0-unsigned.zip` | — |
| 📦 **Source** | zip / tar.gz | `Player-1.0.0-source.zip` + `.tar.gz` | 86 MB |

> 💡 **Tüm platformlar için binary hazır** — kullanıcının kendi derlemesine gerek yok. macOS / iOS sertifikalı değildir; ilk açılışta "Geliştirici onaylanmamış" uyarısı çıkabilir (sistem ayarlarından izin verilebilir).

---

## 💻 Operating System

<table>
  <tr>
    <th align="center">Platform</th>
    <th align="left">İşletim Sistemi</th>
    <th align="left">Mimari</th>
    <th align="left">İndirme</th>
  </tr>
  <tr>
    <td align="center"><img width="48" src="https://img.icons8.com/?size=100&id=tpIcYSg4KMn0&format=png&color=000000" alt="Windows"/></td>
    <td><b>🪟 Windows</b></td>
    <td>x86-64 (Setup installer)</td>
    <td><a href="https://github.com/TARIKTR1099/Player/releases/download/v1.0.0/Player-1.0.0-setup-x64.exe">Player-1.0.0-setup-x64.exe</a></td>
  </tr>
  <tr>
    <td align="center"><img width="48" src="https://img.icons8.com/?size=100&id=w8oAyE4-S89_&format=png&color=000000" alt="macOS"/></td>
    <td><b>🍎 macOS</b></td>
    <td>Intel (x64) + Apple Silicon (arm64) DMG</td>
    <td><a href="https://github.com/TARIKTR1099/Player/releases/latest">DMG (indirilebilir)</a></td>
  </tr>
  <tr>
    <td align="center"><img width="48" src="https://img.icons8.com/?size=100&id=38796&format=png&color=000000" alt="Linux"/></td>
    <td><b>🐧 Linux</b></td>
    <td>x86-64 (AppImage / deb / rpm)</td>
    <td><a href="https://github.com/TARIKTR1099/Player/releases/latest">AppImage (indirilebilir)</a></td>
  </tr>
  <tr>
    <td align="center"><img width="48" src="https://img.icons8.com/?size=100&id=xYzLkOHZVwS8&format=png&color=000000" alt="Android"/></td>
    <td><b>🤖 Android</b></td>
    <td>ARM64 + ARMv7 (APK)</td>
    <td><a href="https://github.com/TARIKTR1099/Player/releases/latest">APK (indirilebilir)</a></td>
  </tr>
  <tr>
    <td align="center"><img width="48" src="https://img.icons8.com/?size=100&id=20828&format=png&color=000000" alt="iOS"/></td>
    <td><b>🍎 iOS</b></td>
    <td>ARM64 (xcodebuild archive)</td>
    <td><a href="https://github.com/TARIKTR1099/Player/releases/latest">Archive (indirilebilir)</a></td>
  </tr>
</table>

---

## ✨ Özellikler

- 🎵 **Medya oynatma**: MP3, FLAC, WAV, M4A, OGG, AAC, MP4, MKV, WEBM
- 🎨 **Spektrum analizörü + dalga formu**
- 🎛️ **10 bantlı ekolayzer + ses efektleri** (yankı, kompresör, bas/tiz)
- 📝 **Altyazı** (SRT/VTT yükleme, zaman çizelgesi, tıklayarak atlama)
- 🤖 **AI entegrasyonu**: OpenRouter, OpenAI, Anthropic, Google, özel endpoint
- 🧩 **Eklenti sistemi**: mağaza, AI ile geliştirme, GitHub yayını, güvenlik analizi
- 🎨 **Tema**: koyu / açık, vurgu rengi, pencere saydamlığı, mini mod
- 🌐 **Tamamen Türkçe ve Tamamen İngilizce** — menüler, ayarlar, bildirimler
- ⌨️ **Klavye kısayolları**: Boşluk (oynat/duraklat), Ctrl+←/→ (parça), F (tam ekran)
- 🖥️ **Sistem tepsisi**: Oynat, Durdur, Sonraki, Önceki, Karıştır, Tekrarla, Ses

## 🔄 v1.0.0 Sürüm Notları

İlk genel sürüm. Electron 28, React 19, Vite, Tailwind 4, Zustand tabanlı. **Yeni:**

- 🌍 **Tam TR / EN i18n** — tüm menüler, ayarlar, bildirimler çift dil. Settings → Kişiselleştirme / Personalization'dan dil değiştirilebilir.
- 🐛 **Sistem tepsisi düzeltildi** — "Durdur / Sonraki / Önceki" butonları artık çalışıyor (renderer tarafında IPC listener eklendi).
- 📱 **Capacitor mobil scaffold** — Android (Gradle) ve iOS (Capacitor) yapılandırması eklendi.
- 🚀 **5-platformlu GitHub Actions release pipeline** — her platform için derlenmiş binary otomatik yükleniyor.

## 🛠️ Kurulum (Windows için)

1. `Player-1.0.0-setup-x64.exe` indir
2. Çalıştır → sihirbaz tamamlanana kadar İleri'ye tıkla
3. **Player** kısayolundan aç

## 🛠️ Kurulum (Linux için)

```bash
# AppImage (tüm dağıtımlar)
chmod +x Player-1.0.0-linux-x86_64.AppImage
./Player-1.0.0-linux-x86_64.AppImage

# veya Debian / Ubuntu
sudo dpkg -i Player-1.0.0-linux-amd64.deb

# veya Fedora / RHEL
sudo rpm -i Player-1.0.0-linux-x86_64.rpm
```

## 🔧 Geliştirici Notu

Kaynak koddan derleme: `npm install && npm run build:all:desktop`. Mobil derleme: `cd mobile && npm install && npx cap sync android && npx cap sync ios`.

## 📝 Lisans

MIT © 2026 TARIK ELER
