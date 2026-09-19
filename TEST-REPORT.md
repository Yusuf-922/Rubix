# Demo 1.0 — Gerçek fotoğraflarla doğrulama

Tarih: 19 Eylül 2026. Ortam: Windows, yerel uygulama ve Codex içindeki tarayıcı.

## Sonuç

Gönderilen altı fotoğraftaki 54 renk hücresi otomatik bulundu ve görsel referansla eşleşti. Fotoğraf dosyalarının adına veya elle girilmiş köşelere bağlı bir üretim kuralı kullanılmadı. Altı yüzün 4096 olası dönüş birleşiminden tek bir geçerli küp durumu bulundu. Kırmızı, turuncu ve mavi merkezli fotoğraflara 180° dönüş gerekti.

## Düzeltilen hatalar

- Ctrl+Shift+Z, geri alma animasyonu sürerken devre dışı düğmeye bağlı olduğu için kayboluyordu. Komutlar artık bekleyen animasyonlar dahil öngörülen geçmiş üzerinde sıraya alınıyor.
- Henüz oynatılmamış bir hamleyi geri almak kuyruktan siliyor ve yeniden uygulamayı engelliyordu. Hamle kaydı korunuyor; ters hamle ve yineleme de sırayla oynatılıyor.
- Renk paleti fotoğraftaki merkezlerden yeniden boyandığı için beyaz başka bir renge dönüşebiliyordu. Altı seçenek artık sabit ve adlandırılmıştır. Beyaz merkez hücresinin devre dışı opaklığı yüzünden gri görünmesi de düzeltildi.
- Fotoğrafın karanlık merkez rengi 3B modele taşınarak renkleri solduruyordu. Sabit canlı renkler ve daha hafif gölgeleme kullanılıyor.
- Dosya seçimi ile klasör yenileme bir arada kullanıldığında aynı isimli fotoğrafın çoğalması önlendi.

## Doğrulanan işlevler

| Alan | Deneme | Sonuç |
| --- | --- | --- |
| Gerçek fotoğraflar | Altı dosyayı klasörden okuma ve dosya seçiciyle yükleme | Geçti |
| Otomatik okuma | Yüz konumu, 9 kare, merkezle yüz eşleme, 54 renk | Geçti |
| Yönler | Tek geçerli yerleşimi bulma, yüzü çevirip yeniden hizalama | Geçti |
| Düzeltme | Yanlış renk durumunda oluşturmayı kapatma, doğru renkle yeniden açma | Geçti |
| Palet | Altı yüz sekmesinde altı seçeneğin ve beyazın korunması | Geçti |
| Yedek seçim | Elle dört köşeden aynı gerçek yüzün doğru okunması | Geçti |
| Fotoğraf listesi | Yenileme, yeniden seçme, aynı dosyaları çoğaltmama | Geçti |
| Küp | Altı yüzün normal, ters ve çift dönüşleri — 18 kontrol | Geçti |
| Geçmiş | Düğmeler, hızlı Ctrl+Z / Ctrl+Shift+Z, kayıt ve hız alanı odakları | Geçti |
| Oynatıcı | Baştan oynatma, duraklat/devam, geçmişi çoğaltmadan canlı küpe dönme | Geçti |
| Çok satır | Shift+Enter, satır sonunda bekleme, sonraki satıra geçme | Geçti |
| Adımlama | Boşluk ile her seferinde tek hamle | Geçti |
| Akış düzenleme | Geçersiz hamleyi reddetme, geçmişi yeniden getirme | Geçti |
| Kısayollar | Özel tuş, Shift ile tersi, çakışan tuşları reddetme, varsayılanlara dönüş | Geçti |
| Kamera | Fare sürükleme, tekerlek, yakınlaştırma düğmeleri, yön tuşları, görünümü sıfırlama | Geçti |
| Diğer | Animasyon hızı, başlangıç küpüne dönüş, yardım açma/kapatma | Geçti |

19 otomatik test başarılı; tarayıcı kontrollerinde konsol hatası görülmedi. Otomatik testler motorun matematiğini, imkânsız durumları, gerçek fotoğrafları ve animasyon sırasında geçmiş komutlarını kapsıyor.

## 19 Eylül 2026 — Çözüm motoru ve görünüm

- `npm test`: 24 başarılı, 0 hata, 0 atlanan test.
- Cubejs ile modelimizin 18 yüz dönüşü aynı yüz dizilerini üretiyor. 12 adet 25 hamlelik karışım ve gönderilen altı fotoğrafın hizalanmış renk dizileri çözüldü; sonuçlar kendi modelimizde doğrulandı.
- Hatalı motor çıktısı ve geçersiz durum reddediliyor. Worker başarı/hata/iptal temizliği otomatik testte kontrol edildi.
- Masaüstü tarayıcıda: çözülmüş küp bildirimi, çözüm hesaplama, Boşluk ile tek adım, baştan otomatik oynatma ve canlı küpe dönüş kontrol edildi.
- Klasördeki mevcut fotoğraflarla oluşturulan küp için 21 hamle üretildi; tamamlanan animasyonda çözülmüş küp görüldü.
- Yeni hamle eski çözüm akışını kaldırıyor. Hızlı Ctrl+Z ve Ctrl+Shift+Z sonrasında canlı geçmiş korundu.
- Dikey eksende 71 yukarı ok basışı ve toplam 800 piksel fare sürüklemesi ile bir tam tur aşıldı; sınırda takılma yok. Masaüstü %90 uygulama ölçeği görsel olarak kontrol edildi. Konsolda hata görülmedi.
- Bu turda mobil görünüm ve gerçek 120 saniyelik zaman aşımı tarayıcıda beklenerek test edilmedi.

## Genel sınırlar

## Kamera ekseni düzeltmesi

Önceki sınırsız Euler açıları, küp tersken yatay kontrolün yönünü değiştiriyor ve kutup görünümünde yatay hareketi ekran üzerinde dönmeye dönüştürüyordu. Fare ve yön tuşları artık ekran eksenlerinde biriken, normalize edilmiş quaternion yönelimi kullanıyor. Yukarı ok ekrandaki ön yüzü yukarı taşır.

27 otomatik test başarılı. Yeni testler ters/kutup yönelimlerinde ekran eksenlerini, çoklu tam turları, 10.000 hareket sonrası uzunluk korunumunu, ters sürükleme ve görünüm sıfırlamayı kapsıyor. Tarayıcıda sarı yukarıdayken sağa sürükleme ve sarı kameraya bakarken sağ ok kontrol edildi; konsol hatası yok.

## Kapsam

Bu sonuç gönderilen altı fotoğraf ve mevcut masaüstü tarayıcı için doğrulandı. Örtülü yüz, yoğun parlama, çok eğik çekim veya farklı renk düzenleri için aynı doğruluk garantisi verilmez. Belirsiz algılamada elle düzeltme kullanılabilir. Sayfa yenilendiğinde mevcut oturum sıfırlanır; klasördeki fotoğraflar korunur.
