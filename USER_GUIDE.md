# Player 1.0.0 — Kullanım Kılavuzu

## İçindekiler
1. [Giriş](#giriş)
2. [Arayüz Genel Bakış](#arayüz-genel-bakış)
3. [Müzik Oynatma](#müzik-oynatma)
4. [Kütüphane Yönetimi](#kütüphane-yönetimi)
5. [Altyazı Kullanımı](#altyazı-kullanımı)
6. [Ekolayzer & Efektler](#ekolayzer--efektler)
7. [Görselleştirici](#görselleştirici)
8. [Mini Mod & Tam Ekran](#mini-mod--tam-ekran)
9. [YouTube İndirme](#youtube-indirme)
10. [Ayarlar](#ayarlar)
11. [Kısayol Tuşları](#kısayol-tuşları)
12. [Sık Sorulan Sorular](#sık-sorulan-sorular)

---

## Giriş

Player 1.0.0, Windows için geliştirilmiş modern bir müzik çalar uygulamasıdır. MP3, FLAC, WAV, M4A, OGG, AAC gibi tüm yaygın ses formatlarını destekler. Ayrıca video dosyalarını da oynatabilir.

### Başlarken

Uygulamayı ilk açtığınızda karşınıza üç ana bölümden oluşan bir arayüz çıkar:
- **Sol Panel**: Kütüphane ve dosya gezgini
- **Orta Alan**: Şarkı listesi ve medya görüntüleyici
- **Alt Çubuk**: Oynatma kontrolleri

---

## Arayüz Genel Bakış

```
┌────────────────────────────────────────────────────┐
│  ☰ Kütüphane    ─── [Şarkı Listesi] ───  ⚙ Ayarlar │  ← Üst çubuk
├────────┬───────────────────────────────┬──────────┤
│        │                               │  Altyazı  │
│Dosyalar│      Albüm Kapağı / Video     │  Zaman    │
│Klasör  │      + Görselleştirici        │ Çizelgesi │
│Çalma   │                               │          │
│Listesi │                               │          │
├────────┴───────────────────────────────┴──────────┤
│  ⏮ ⏸ ⏭  ────●───────────────  03:24 / 05:12  🔊 │  ← Alt çubuk
└────────────────────────────────────────────────────┘
```

### Bölümler

1. **Üst Çubuk**: Kütüphane yönetimi, arama, ayarlar, pencere kontrolleri
2. **Sol Panel**: Dosya sistemi, klasörler, çalma listeleri
3. **Orta Alan**: Seçili şarkıların listesi ve medya görüntüleyici (albüm kapağı/video)
4. **Sağ Panel (Altyazı)**: SRT/VTT altyazı zaman çizelgesi
5. **Alt Çubuk**: Oynatma kontrolleri, ses ayarı, ilerleme çubuğu

---

## Müzik Oynatma

### Dosya Açma Yöntemleri

1. **Sürükle-Bırak**: Dosyaları doğrudan uygulama penceresine sürükleyin
2. **Dosya Aç**: Üst çubuktaki "Aç" butonuna tıklayın
3. **Klasör Aç**: "Klasör Aç" ile tüm bir klasörü kütüphaneye ekleyin
4. **Dosya Gezgini**: Sol panelden dosyalara göz atın

### Oynatma Kontrolleri

| Buton | Kısayol | İşlev |
|-------|---------|-------|
| ⏮ | `Ctrl + ←` | Önceki şarkı |
| ⏸ / ▶ | `Space` | Oynat / Duraklat |
| ⏭ | `Ctrl + →` | Sonraki şarkı |
| 🔀 | `Ctrl + S` | Karışık çalma |
| 🔁 | `Ctrl + R` | Tekrarlama modu |

### Ses Kontrolleri

- Ses çubuğunu sürükleyerek ses seviyesini ayarlayın
- Ses simgesine tıklayarak sesi kapatın/açın
- Ses çubuğunun üzerine gelince yüzde (%) değerini görürsünüz

### İlerleme Çubuğu

- Alt çubuktaki ilerleme çubuğuna tıklayarak şarkı içinde gezinebilirsiniz
- Süre bilgisi sol tarafta gösterilir
- **Sağ tık** menüsünden şarkı adını kopyalayabilirsiniz

---

## Kütüphane Yönetimi

### Kategoriler

Kütüphane görünüm modları:
- **Liste**: Ayrıntılı liste görünümü
- **Grid**: Albüm kapaklarıyla ızgara görünümü
- **Klasör**: Dosya sistemi ağacı

### Çalma Listeleri

- Sol panelden "Yeni Çalma Listesi" oluşturun
- Şarkılara sağ tıklayıp "Çalma Listesine Ekle" ile ekleyin
- Çalma listelerine sürükle-bırak desteği

### Arama

- Üst çubuktaki arama kutusu ile kütüphanenizde arama yapın
- Şarkı adı, sanatçı, albüm kategorilerinde arama yapar

---

## Altyazı Kullanımı

Player 1.0.0, SRT ve VTT altyazı formatlarını destekler.

### Altyazı Yükleme

1. Sağ paneli açmak için üç nokta menüsü → "Altyazı" seçeneğini kullanın
2. "SRT/VTT Yükle" butonuna tıklayın
3. `.srt` veya `.vtt` dosyasını seçin

### Altyazı Zaman Çizelgesi

Yükleme sonrası tüm altyazı satırları zaman çizelgesinde görünür:
- **Mavi vurgu**: Şu an oynatılan satır
- **Soluk metin**: Geçmiş satırlar
- **Normal metin**: Gelecek satırlar
- Otomatik kaydırma ile aktif satır her zaman görünür

### Kullanım

- Herhangi bir altyazı satırına tıklayarak o ana atlayabilirsiniz
- Sağ panelin alt kısmında güncel satır ve ilerleme bilgisi gösterilir
- Aynı anda birden fazla altyazı dosyası yükleyip aralarında geçiş yapabilirsiniz

---

## Ekolayzer & Efektler

### Ekolayzer

10 bantlı grafik ekolayzer ile sesi özelleştirin:
1. Alt çubuktaki ekolayzer simgesine tıklayın (📊)
2. Her frekans bandını ayrı ayrı ayarlayın
3. Ön tanımlı presetlerden seçim yapın:
   - Normal, Pop, Rock, Jazz, Klasik, Dans, Vokal

### Efektler

Efektler modülü ile:
- **Hız**: Oynatma hızını 0.5x - 2.0x arası değiştirin
- **Yankı (Reverb)**: Ses boyutunu artırın
- **Filtreler**: Bas/Tiz ayarları
- **Kaydırma (Pan)**: Sol-sağ dengesi

---

## Görselleştirici

Görselleştirici modülü ile müziğin ritmini görsel olarak takip edin.

### Spektrum Analizörü

- Alt çubuktaki görselleştirici simgesine tıklayarak açın/kapatın
- **3D mod**: Üç boyutlu spektrum görünümü (varsayılan)
- Spektrum frekans aralıklarını gösterir

### Dalga Formu

- Alt çubuktaki dalga formu simgesine tıklayın
- Sesin dalga formunu görüntüleyin
- Dalga formu üzerinde gezinme desteği

---

## Mini Mod & Tam Ekran

### Mini Mod

Küçültülmüş pencere modu:
- Üç nokta menüsü → "Mini Mod" ile etkinleştirin
- Sadece temel kontrolleri gösterir
- Masaüstünde minimal alan kaplar
- Büyüt simgesine tıklayarak normal moda dönün

### Tam Ekran Medya Modu

Sadece medyayı gösteren tam ekran modu:
- Üç nokta menüsü → "Tam Ekran Medya" ile etkinleştirin
- Albüm kapağı veya video tam ekran gösterilir
- Fareyi hareket ettirince kontroller görünür
- `Escape` tuşu veya çift tıklama ile çıkış

---

## YouTube İndirme

1. Üst çubuktaki YouTube simgesine tıklayın
2. YouTube URL'sini yapıştırın
3. İndirme kalitesini seçin
4. "İndir" butonuna tıklayın

**Not**: YouTube indirme için FFmpeg gereklidir. FFmpeg yoksa uygulama sizi yönlendirecektir.

---

## Ayarlar

Ayarlar menüsüne üst çubuktaki ⚙ simgesinden erişin.

### Görünüm

| Ayar | Açıklama |
|------|----------|
| Tema | Koyu / Açık / Sistem |
| Vurgu Rengi | Ana renk seçimi (Mavi, Mor, Yeşil, Turuncu, Pembe) |
| Saydamlık | Pencere saydamlık seviyesi (0.8 - 1.0) |
| Dil | Türkçe / English |

### Oynatma

| Ayar | Açıklama |
|------|----------|
| Otomatik Oynat | Şarkı seçildiğinde otomatik oynat |
| Kesintisiz Çalma | Şarkılar arasında geçişte kesintisiz oynatma |
| Varsayılan Ses | Başlangıç ses seviyesi |

### Gelişmiş

| Ayar | Açıklama |
|------|----------|
| Donanım Hızlandırma | GPU ivmelendirme |
| Önbellek Boyutu | Ses önbellek boyutu |
| Dosya Tarama | Başlangıçta otomatik tarama |

---

## Kısayol Tuşları

| Kısayol | İşlev |
|---------|-------|
| `Space` | Oynat / Duraklat |
| `Ctrl + ←` | Önceki şarkı |
| `Ctrl + →` | Sonraki şarkı |
| `Ctrl + S` | Karışık çalma |
| `Ctrl + R` | Tekrarlama modu |
| `Ctrl + F` | Arama kutusu |
| `Ctrl + L` | Altyazı paneli |
| `Ctrl + M` | Mini mod |
| `Ctrl + E` | Ekolayzer |
| `Ctrl + Shift + F` | Tam ekran medya |
| `Ctrl + ,` | Ayarlar |
| `Escape` | Tam ekrandan çıkış |
| `↑ / ↓` | Ses artır/azalt |
| `← / →` | İleri/geri sar (5 sn) |
| `Delete` | Seçili şarkıyı kaldır |
| `Ctrl + C` | Şarkı adını kopyala |
| `F11` | Pencere tam ekran |

---

## Sık Sorulan Sorular

### S: Hangi dosya formatlarını destekliyor?
**C**: MP3, FLAC, WAV, M4A (AAC/ALAC), OGG Vorbis, AAC, WMA, Opus ve video formatları (MP4, MKV, AVI, MOV, WebM).

### S: YouTube indirme neden çalışmıyor?
**C**: YouTube indirme için FFmpeg gereklidir. FFmpeg'i [ffmpeg.org](https://ffmpeg.org) adresinden indirip PATH'e ekleyin veya uygulamanın yanındaki `ffmpeg.exe` dosyasını koyun.

### S: Altyazı dosyası nasıl bulurum?
**C**: Şarkı adıyla aynı isimde `.srt` dosyasını yükleyin. Örnek: `sarki.mp3` için `sarki.srt`.

### S: Ayarlar nerede saklanıyor?
**C**: Ayarlar `%APPDATA%/player-music/config.json` dosyasında saklanır.

### S: Birden fazla ses çıkışı kullanabilir miyim?
**C**: Şu an için sadece varsayılan ses çıkışı desteklenmektedir.

---

*Son güncelleme: Mayıs 2026*
