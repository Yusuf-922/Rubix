# Rubix · Demo 1.0

Fotoğraftan oluşturulan, fareyle incelenebilen ve hamle yapılabilen yerel 3×3 küp uygulaması.

## Çalıştırma

Node.js kurulu bilgisayarda bu klasörde `npm start` çalıştırın ve http://127.0.0.1:4173 adresini açın. Harici paket kurulumu gerekmez. Sunucu yalnızca bu bilgisayardan erişilebilir.

## Fotoğraflar

Fotoğrafları `kup-fotograflari` klasörüne koyup uygulamada **Klasörü yenile** seçin. Alternatif olarak **Fotoğraf seç** ile JPG, PNG veya WebP dosyaları ekleyin. Dosyalar bir dış servise gönderilmez.

**Fotoğrafları otomatik tanı** düğmesi altı fotoğraftaki 3×3 yüzleri bulur; merkez renkleriyle yüzlere yerleştirir ve fotoğrafların dönüşlerini geçerli küp durumuna göre belirler. Köşe işaretlemek gerekmez. Tek fotoğraf seçiminde de otomatik algılama çalışır. **Yönleri bul** düğmesi, sonradan yapılan düzeltmelerden sonra yönleri yeniden eşleştirir. **Küpü oluştur** yalnızca geçerli bir durum için açılır.

Gönderilen altı gerçek fotoğraftaki 54 kare ve tek geçerli yüz yerleşimi doğrulandı. Algılayıcı renkli bölgeleri ve 3×3 geometrisini birlikte kullanır; koyu kırmızı/turuncu ayrımını renk tonu üzerinden yapar. Bu sürümün referansı beyaz üst, sarı alt, yeşil ön, mavi arka, kırmızı sağ, turuncu soldur. Ağır gölge, parlama, örtülü yüz veya farklı renk düzenleri düzeltme gerektirebilir. Algılama başarısızsa **Elle köşe seç** kullanılabilir; geçerli bir yüz bulunmadan renkler uydurulmaz. Birden çok geçerli yön varsa belirsizlik belirtilir.

Palet daima beyaz, kırmızı, yeşil, sarı, turuncu ve mavi seçeneklerini gösterir. Fotoğraf merkezinin karanlık çıkması paletin rengini değiştirmez. 3B görünümde canlı renkler ve hafif gölgeleme kullanılır.

## Kontroller

- Sürükle: Kamera açısı. Tekerlek: Yakınlaşma.
- U, R, F, D, L, B: Yüz dönüşü. Shift: Ters yön.
- Ekrandaki 90°, −90°, 180° seçimi düğmeleri ve Shift kullanılmayan klavye hamlelerini etkiler.
- Geri al, yinele ve başlangıç durumuna dönüş desteklenir.
- Saat yönü, döndürülen yüze karşıdan bakılarak belirlenir. Kamera hareketi yüz referansını değiştirmez.

Fotoğraflar başlangıç durumunu aktarır; fiziksel hamleler canlı izlenmez. Hamleleri kullanıcı girer. Sayfa yenilenirse oturum sıfırlanır; klasördeki fotoğraflar korunur.

## Hamle akışı ve yeniden oynatma

- Canlı hamleler akış alanına otomatik yazılır. Akış alanını düzenlersen bu taslak korunur; **Geçmişi getir** canlı kaydı yeniden alır.
- **Yeniden oynat** akışı oturumun başlangıç küpünden animasyonla gösterir. Canlı geçmişe hamle eklemez.
- **Shift + Enter** yeni satır oluşturur. Akıcı oynatma satır sonunda bekler; **Boşluk** sonraki satırı başlatır.
- **Adım adım** başlangıca döner ve bekler. Her **Boşluk** basışı bir hamleyi oynatır. Animasyon sürerken ek basışlar sıraya alınmaz.
- **Duraklat** mevcut hamlenin bitmesini bekleyip akışı durdurur. **Canlı küpe dön** önizleme öncesindeki küpü geri getirir.
- **Ctrl + Z** canlı küpte son hamleyi geri alır; **Ctrl + Y** yineler. Ctrl+Shift+Z küp için işlem yapmaz. Bu komutlar animasyon sürerken de sıraya alınır. Düzenlenmiş metin alanında yazının kendi geri alma/yinelemesi çalışır; salt okunur ya da otomatik kayıt alanında küp komutları kullanılabilir.
- Yön tuşları bakış açısını değiştirir. **Klavye kısayolları** bölümünde her yüze farklı bir harf veya rakam atanabilir; tercihler tarayıcıda saklanır.
- Akışın notasyonu özel kısayollardan bağımsızdır: U, R, F, D, L, B ve bunların ters/çift dönüşleri kullanılır.

## Doğrulama

`npm test`: Küp motoru, 500 hamlelik dizi, imkânsız durumlar, perspektif, renk okuma, çok satırlı oynatma, kısayollar, animasyon sırasında geri alma/yineleme ve altı gerçek fotoğraf (19 test). Gerçek fotoğraf testi yerel `tests/fixtures/real` verisini kullanır; bu özel görüntüler Git'e eklenmez. Veriyi yeniden hazırlamak için Pillow bulunan Python ile `tests/prepare-real-photos.py` çalıştırılır. Veri yoksa ilgili test açıkça atlanır.

Uygulama JavaScript küp modeli, perspektif projeksiyon kullanan Canvas 3B çizimi ve yerel Node.js sunucusundan oluşur. Çözüm için MIT lisanslı cubejs yerel olarak paketlenmiştir; npm kurulumu veya çalışma anında internet gerekmez. Ders ve algoritma kütüphanesi sonraki aşamalardır.

**Küpü sıfırla** çözülmüş küpü getirir ve hamle geçmişini temizler. **Başa dön**, fotoğraflardan oluşturulan başlangıç küpünü geri getirir. Sıfırlamadan sonraki hamlelerin oynatımı çözülmüş küpten başlar.

## Küpü çöz

- **Küpü çöz**, o anki canlı küpü doğrular ve cubejs/Kociemba motorunda arka planda çözüm arar. Hesaplama iptal edilebilir; 120 saniye sınırı vardır.
- Sonuç, kendi küp modelimiz üzerinde uygulanarak doğrulanır. Hamle sayısı ve notasyonları gösterilir; en kısa çözüm garantisi yoktur.
- **Çözümü oynat** veya **Adım adım**, hesaplama anındaki küpten başlar. **Canlı küpe dön** önceki durumu korur. Çözüm önizlemesi canlı geçmişi değiştirmez.
- Yeni bir canlı hamle, sıfırlama veya **Geçmişi getir** çözüm akışından çıkar. Hesaplama sırasında küp değişirse eski sonuç uygulanmaz.
- Masaüstü arayüzü %90 ölçeğindedir; tarayıcı %100 yakınlaştırmada kullanılabilir. Küçük ekranlarda normal ölçek korunur.
- Fare ve yön tuşları ile her iki eksende sınırsız dönüş yapılabilir.
- Çözüm entegrasyonuyla otomatik test toplamı **24** oldu: tüm 18 dönüşün motorlar arası eşleşmesi, 12 karışım, fotoğraf renk dizileri, geçersiz durum, çözüm doğrulaması ve worker iptal/hata temizliği dahildir.
