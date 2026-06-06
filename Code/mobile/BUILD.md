# Mobile Build Guide — Player (Capacitor)

Player Electron versionunu Capacitor ile iOS ve Android'e paketler.
Bu sürümler macOS + Xcode (iOS) ve Android Studio gerektirir;
**electron-builder üretemez**. GitHub Actions runner'ları da iOS için
developer certificate gerektirir, bu yüzden **local build** önerilir.

---

## Önkoşullar

- **Node.js 20+**, **npm 10+**
- **macOS** (iOS için zorunlu) veya **Linux/Windows + Android Studio** (Android için)
- **Xcode 15+** (iOS)
- **Android Studio Hedgehog (2023.1.1)+** + **JDK 17** + **Android SDK 34+**

---

## Web build

```bash
npm ci
npm run build-web
```

Bu, `dist-web/` üretir. Capacitor `webDir: "dist-web"` kullanır.

## Capacitor sync

```bash
cd Code/mobile
npm install
npx cap sync
```

Bu komut:
- `dist-web/` → `android/app/src/main/assets/public/` ve `ios/App/public/` kopyalar
- Capacitor pluginlerini native projelere yükler

## Android APK

```bash
cd Code/mobile
npx cap sync android

cd android
./gradlew assembleRelease
# Çıktı: app/build/outputs/apk/release/app-release.apk
```

İmzalama:
- **Debug APK** (test için): `./gradlew assembleDebug` → hızlıca test edilebilir
- **Release APK** (imzalı): `android/app/build.gradle` `signingConfigs` ayarla
  + keystore oluştur: `keytool -genkey -v -keystore player.keystore -alias player -keyalg RSA -keysize 2048 -validity 10000`

## iOS IPA

```bash
cd Code/mobile
npx cap sync ios

cd ios/App
pod install   # ilk seferde

xcodebuild \
  -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath build/Player.xcarchive \
  -destination 'generic/platform=iOS' \
  archive
```

Çıktı: `build/Player.xcarchive`. Xcode ile aç → "Distribute App" → IPA üret.

App Store'a göndermek için **Apple Developer hesabı ($99/yıl)** + provisioning profile gerekli.

---

## Notlar

- Capacitor config: `Code/mobile/capacitor.config.json`
- iOS bundle ID: `com.tarıkeler.player`
- Android package: `com.tarıkeler.player`
- App icon kaynakları: `Assets/` (electron için) → bunlar Capacitor'da da geçerli
  ama Capacitor ayrı `icon-1024.png` (iOS) ve `mipmap-*` (Android) ister.
  `npx capacitor-assets generate` aracı tüm boyutları üretir.

---

## Hızlı test (local)

```bash
# Android emulator açıkken
cd Code/mobile
npx cap run android

# iOS simulator açıkken (sadece macOS)
cd Code/mobile
npx cap run ios
```

Bu komutlar doğrudan emulator/simulator'a yükler, hot-reload Web bundle'ı
getirir. Debug için ideal.
