# Rubix · 3×3 Küp Atölyesi

<p align="center">
  Fotoğraflarından 3×3 küp oluştur, hamlelerini görselleştir ve çözümü üç boyutta izle.
</p>

<p align="center">
  <a href="https://yusuf-922.github.io/Rubix/"><strong>✦ Uygulamayı aç</strong></a>
  ·
  <a href="#başlangıç">Başlangıç</a>
  ·
  <a href="#kontroller">Kontroller</a>
  ·
  <a href="#geliştirme">Geliştirme</a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/actions/workflow/status/Yusuf-922/Rubix/pages.yml?branch=main&label=test%20ve%20yay%C4%B1n&style=flat-square" alt="Test ve yayın durumu">
  <img src="https://img.shields.io/github/last-commit/Yusuf-922/Rubix?style=flat-square" alt="Son güncelleme">
  <img src="https://img.shields.io/badge/3%C3%973-Rubik%20K%C3%BCp%C3%BC-5ad49b?style=flat-square" alt="3×3 Rubik Küpü">
</p>

## Canlı sürüm

Uygulama herkese açık olarak burada çalışır: **[yusuf-922.github.io/Rubix](https://yusuf-922.github.io/Rubix/)**

Arkadaşların bağlantıyı tarayıcıdan doğrudan açabilir. Altı yüz fotoğrafını **Kamerayla çek** veya **Fotoğraf seç** düğmesiyle ekleyebilirler; görüntüler yalnızca o tarayıcı oturumunda işlenir.

## Neler yapabilir?

| Alan | Özellik |
| --- | --- |
| Fotoğraf aktarımı | Altı yüzü otomatik algılar, 3×3 kareleri okur ve yüzlerin yönlerini eşleştirir. |
| 3B görünüm | Fare, yön tuşları ve tekerlekle küpü her açıdan inceleme. |
| Hamleler | `U R F D L B`, ters ve çift dönüşler; özelleştirilebilir klavye kısayolları. |
| Akış oynatıcı | Hamle notasyonu, yeniden oynatma, duraklatma ve Boşluk ile adım adım ilerleme. |
| Çözüm | Kociemba iki aşamalı çözüm motoruyla çözüm üretir, sonucu model üzerinde doğrular. |
| Geçmiş | Geri alma, yineleme, başlangıca dönüş ve doğrudan çözülmüş küpe sıfırlama. |

## Başlangıç

1. **[Canlı uygulamayı aç](https://yusuf-922.github.io/Rubix/).**
2. Küpün altı yüzünün fotoğrafını çek. Fotoğraflar arasında katman çevirmeden sadece bütün küpü döndür.
3. **Kamerayla çek** ile yüzü doğrudan kameradan al veya **Fotoğraf seç** ile mevcut görselleri ekle; ardından **Fotoğrafları otomatik tanı** düğmesine bas.
4. Renk önizlemelerini kontrol et. Gerekirse paletten renk seçip hatalı kareye tıkla.
5. **Küpü oluştur** ile modeli hazırla; ardından hamle gir veya **Küpü çöz** düğmesini kullan.

Fotoğraf algılama, merkez renkleriyle yüzleri yerleştirir ve olası yüz yönlerini dener. Küp gerçekten fiziksel olarak geçersizse oluşturma engellenir. Kamera erişimi, yalnızca **Kamerayla çek** düğmesine basıldığında istenir; çekilen görüntü sunucuya gönderilmez.

## Kontroller

| Kontrol | İşlev |
| --- | --- |
| Fareyle sürükle | Kamerayı döndür |
| Fare tekerleği | Yakınlaştır / uzaklaştır |
| `← ↑ ↓ →` | Kamerayı ekran yönlerine göre döndür |
| `U R F D L B` | İlgili yüzü 90° döndür |
| `Shift` + yüz tuşu | İlgili yüzü ters yönde döndür |
| `Ctrl + Z` | Son hamleyi geri al |
| `Ctrl + Y` | Geri alınan hamleyi yinele |
| `Shift + Enter` | Hamle akışında yeni satır ve bekleme noktası oluştur |
| `Boşluk` | Adım adım oynatıcıda sonraki hamleyi uygula |

`Başa dön`, fotoğraflardan oluşturduğun başlangıç küpünü geri getirir. `Küpü sıfırla` ise küpü doğrudan çözülmüş forma alır.

## Çözüm ve oynatma

**Küpü çöz** düğmesi, canlı küp durumunu doğrular ve çözümü arka planda hesaplar. Çıkan notasyon önce uygulamanın kendi küp modeli üzerinde kontrol edilir; ardından:

- **Çözümü oynat** tüm hamleleri akıcı biçimde gösterir.
- **Adım adım** her hamlede Boşluk tuşunu bekler.
- **Canlı küpe dön** önizleme öncesindeki küp durumunu geri yükler.

Çözüm kısa olmaya çalışır ancak matematiksel olarak en kısa çözüm garantisi vermez.

## Yerelde çalıştırma

Bu depo yerel fotoğraf klasörünü de destekler. Node.js 22 veya daha yenisiyle:

```powershell
git clone https://github.com/Yusuf-922/Rubix.git
cd Rubix
npm test
npm start
```

Tarayıcıdan `http://127.0.0.1:4173` adresini aç. Windows üzerinde `BASLAT.cmd` dosyası da uygulamayı başlatır.

Yerel sürümde fotoğrafları `kup-fotograflari` klasörüne bırakıp **Klasörü yenile** düğmesini kullanabilirsin. Bu klasördeki görüntüler Git’e eklenmez.

## Geliştirme

```powershell
npm test
```

Testler küp dönüşlerini, fiziksel durum doğrulamasını, hamle oynatıcısını, fotoğraf yön eşlemesini, çözüm motorunu ve kamera yönelimini kapsar.

## Yayınlama

`main` dalına yapılan her gönderimde GitHub Actions önce testleri çalıştırır, ardından başarılıysa uygulamayı GitHub Pages üzerinde yayınlar.

Canlı adres: [https://yusuf-922.github.io/Rubix/](https://yusuf-922.github.io/Rubix/)

## Sınırlar

- Oturum verisi sayfa yenilendiğinde sıfırlanır.
- Fiziksel küpteki hamleler kameradan canlı takip edilmez; hamleler uygulamaya girilir.
- Güçlü parlama, ağır gölge, çok eğik çekim veya farklı renk düzenleri elle renk düzeltmesi gerektirebilir.

## Lisanslar ve teşekkür

Çözüm motoru, yerel olarak paketlenen MIT lisanslı [cubejs](https://github.com/ldez/cubejs) projesini kullanır. Ayrıntılı lisans metni [public/vendor/cubejs/LICENSE](public/vendor/cubejs/LICENSE) dosyasındadır.
