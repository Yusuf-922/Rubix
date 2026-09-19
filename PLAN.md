# 3×3 Rubik Küpü — Proje Planı

İlk teslim: **Demo 1.0 — Küp modelleme ve görselleştirme**

Durum: Demo 1.0 geliştirildi. Fare/klavye ile 3B inceleme, yüz hamleleri, animasyon, notasyon, geri alma/yineleme ve otomatik fotoğraf aktarımı mevcut. Gönderilen altı gerçek fotoğrafın 54 karesi doğru okundu ve tek geçerli yüz yönü bulundu.

Güncel doğrulama: 19 otomatik test geçti. Gerçek fotoğraflarla otomatik yüz/renk tanıma, yüz yönlerini bulma ve 3B küp oluşturma tarayıcıda kontrol edildi. Köşe seçimi yalnızca otomatik algılama başarısız olduğunda isteğe bağlı yedektir. Beyaz dahil sabit renk paleti ve daha canlı 3B renkler eklendi. Ctrl+Shift+Z'nin devam eden geri alma animasyonunda kaybolması giderildi; Ctrl+Y de desteklenir.

Eklenen etkileşimler: Özel klavye kısayolları, Ctrl+Z/Ctrl+Shift+Z, yön tuşlarıyla kamera, düzenlenebilir çok satırlı akış, baştan oynatma ve Boşluk ile adımlama. Shift+Enter ile eklenen satırlar akıcı oynatmada bekleme noktasıdır. Oynatıcı canlı küpü ve geçmişi koruyan ayrı bir önizleme olarak çalışır. Algoritma kataloğu henüz eklenmedi.

## 1. Amaç ve ürün yönü

Kullanıcının fiziksel 3×3 Rubik küpünün dijital kopyasını oluşturmak, küpü üç boyutlu ortamda incelemek ve hamleleri animasyonlarıyla birlikte göstermek.

Bu temel daha sonra küp çözüm aracına, eğitim arayüzüne ve pratik ortamına dönüşecek. Uzun vadede başlangıçtan ileri seviyeye uzanan kapsamlı bir algoritma kütüphanesi bulunacak. Algoritmalar sanal küpte oynatılırken notasyonları küpün altında gösterilecek.

## 2. Kararlaştırılanlar ve öneriler

### Kullanıcının belirlediği gereksinimler

- Ana arayüzde etkileşimli bir 3×3 küp bulunacak.
- Küp fareyle üç boyutlu olarak her açıdan incelenebilecek.
- Yüklenen fiziksel küp fotoğraflarındaki renkler doğru yüzlere aktarılacak; merkezler yüz eşleştirmesinde kullanılacak.
- Fiziksel küpte yapılan yüz dönüşlerinin sanal küpte karşılığı olacak.
- Hamleler animasyonla gösterilecek ve notasyonları küpün altında yer alacak.
- İlk aşama Demo 1.0: Modelin, görsel sunumun ve etkileşimin doğruluğunu değerlendirmek.
- Çözüm, eğitim, pratik ve geniş algoritma kütüphanesi sonraki aşamalarda geliştirilecek.

### Öneri olarak kalan tercihler

- Önce bilgisayar tarayıcısında kullanılan, daha sonra mobil ekrana uyarlanan bir web uygulaması.
- Türkçe açıklamalar ve standart küp notasyonu.
- Klavye kısayollarının yanında tıklanabilir dönüş düğmeleri.
- İlk aşamada hesap gerektirmeyen kullanım.
- Fotoğrafları başlangıçta dosya olarak yükleme; telefondan doğrudan aktarımı daha sonra değerlendirme.

Teknoloji, görsel stil ve kesin kısayollar henüz seçilmedi.

## 3. Demo 1.0 kapsamı

Demo şu soruyu cevaplayacak: **Fiziksel küpü doğru modelleyip kullanıcının istediği şekilde görüntüleyebiliyor ve hareket ettirebiliyor muyuz?**

### 3.1. Üç boyutlu küp ve fare etkileşimi

- Altı yüzün renkleri, parçaların konumları ve yönleri tutarlı olacak.
- Bir katman döndüğünde ona bağlı parçalar ve komşu yüzlerdeki renkler birlikte güncellenecek.
- Sol fare tuşuyla sürükleme bakış açısını değiştirecek; tekerlek yakınlaştırıp uzaklaştıracak.
- Başlangıç görünümüne dönme düğmesi bulunacak.
- Ön ve üst referans yüzleri harf ve merkez rengiyle görünür tutulacak.
- Kamera hareketi, küpün mantıksal durumunu veya hamle geçmişini değiştirmeyecek.
- İlk demoda yüz dönüşleri klavye veya düğmelerle yapılacak. Yüzü sürükleyerek katman döndürme daha sonra değerlendirilecek.

### 3.2. Fotoğraflardan başlangıç durumu

1. Kullanıcı iki komşu yüzü ön ve üst referansı olarak belirler.
2. Kılavuz altı yüzün fotoğrafını sırayla ister; her çekimde küpün nasıl tutulacağını gösterir. Çekimler arasında katman çevrilmez.
3. Uygulama her yüzdeki dokuz rengi okur ve merkezleri kullanarak yüzleri eşler.
4. Sonuç altı adet 3×3 önizleme ve 3B küp üzerinde gösterilir.
5. Kullanıcı yanlış okunan rengi düzeltebilir veya yüz önizlemesini 90 derece çevirebilir. Belirsiz okumalar işaretlenir.
6. Geçerli olduğu doğrulanan durum oturumun başlangıcı olarak alınır.

**Yön bilgisi:** Merkez rengi yüzü tanımaya yardımcı olur; fotoğrafın kendi düzlemindeki dönüşünü tek başına belirlemez. Çekim kılavuzu komşu yüz referanslarını koruyacak. Serbest yüklenen fotoğraflarda yön belirsizse kullanıcıdan yön düzeltmesi istenecek.

**Durum kontrolü:** Eksik veya yinelenen yüzler, renk adetleri, parça kimlikleri, kenar/köşe yönelimleri ve permütasyon tutarlılığı denetlenecek. Geçersiz durum başlangıç olarak kabul edilmeyecek. Manuel düzeltme otomatik aktarımı destekleyecek.

### 3.3. Hamle kontrolleri

Önerilen ilk düzen:

| Kontrol | İşlem |
| --- | --- |
| U / D | Üst / alt yüzü 90 derece saat yönünde döndür |
| L / R | Sol / sağ yüzü 90 derece saat yönünde döndür |
| F / B | Ön / arka yüzü 90 derece saat yönünde döndür |
| Shift + yüz tuşu | Seçilen yüzü ters yönde döndür |
| Ekrandaki çift dönüş kontrolü | Seçilen yüzü 180 derece döndür |
| Geri al / Yeniden uygula | Son hamleyi geri al veya tekrar uygula |
| Başlangıç durumuna dön | Küpü oturum başındaki durumuna getir |

Saat yönü ilgili yüze karşıdan bakılarak tanımlanır. Kamera açısını değiştirmek tuşların bağlı olduğu yüzleri değiştirmez. Kullanıcı fiziksel küpünü gösterilen ön ve üst referansına göre tutar.

Metin alanına yazarken küp kısayolları çalışmaz. Animasyon sırasında gelen hamleler sıraya alınır. Kamera sıfırlama ile küp durumunu sıfırlama ayrı kontrollerdir.

### 3.4. Animasyon ve küpün altında notasyon

- Dönüşler izlenebilir katman animasyonlarıyla gösterilecek; hız ayarlanabilecek.
- Küpün hemen altında hamle şeridi bulunacak. Örnek: `R U R' U'`.
- O anda uygulanan hamle vurgulanacak; tamamlanmış ve sırada bekleyen hamleler ayırt edilecek.
- Hamlenin kısa Türkçe anlamı gösterilebilecek. Örneğin `U'`: üst yüzü ters yönde çevir.
- Geri alma ve yeniden uygulamada küp, geçmiş ve hamle vurgusu aynı durumu gösterecek.
- Uzun dizilerde şerit kaydırılabilecek; etkin hamle görünür kalacak.

Demo kapsamındaki şerit kullanıcının girdiği hamleleri gösterir. Hazır algoritma seçimi ve tam oynatıcı sonraki aşamadır.

### 3.5. Fiziksel küple eşleşme

Kullanıcı fotoğraflarıyla sanal küpü oluşturur. Fiziksel küpünün üst yüzünü çevirir, ardından uygulamada aynı hamleyi girer. Sanal küp aynı hareketi animasyonla yapar ve hamle alttaki şeride eklenir.

Demo fiziksel hareketleri canlı kameradan takip etmez; kullanıcı hamleleri bildirir. Geri alma yalnızca dijital küpü değiştirir. İki durum ayrıştığında kullanıcı geçmişi kontrol ederek düzeltir veya fotoğrafları yeniden yükler.

### Demo dışında kalanlar

- Otomatik çözüm üretimi ve açıklamalı çözüm rehberi.
- Dersler, beyaz artı alıştırmaları, ipuçları ve eğitim ilerlemesi.
- Kapsamlı algoritma kütüphanesi ve algoritma seçim ekranı.
- Süreli pratik, istatistikler, hesap ve cihazlar arası eşitleme.
- Canlı kameradan fiziksel hamle algılama.

## 4. Demo ekranının taslağı

| Bölge | İçerik |
| --- | --- |
| Orta | Büyük 3B küp ve ön/üst yüz referansları |
| Küpün hemen altı | Hamle notasyonları ve etkin hamle vurgusu |
| Alt kontrol alanı | Yüz dönüşleri, geri al, yeniden uygula ve animasyon hızı |
| Sol panel | Fotoğraf yükleme, altı yüz önizlemesi ve renk/yön düzeltme |
| Üst araç alanı | Başlangıç görünümüne ve başlangıç küp durumuna dönüş |

Küp ana odak olacak. Fotoğraf paneli gerektiğinde kapanabilecek. Eğitim açıklamaları için sonraki aşamada yan panel eklenebilecek.

## 5. Demo 1.0 kabul ölçütleri

### Model doğruluğu

- Bir yüzü dört kez 90 derece döndürmek başlangıç durumunu geri getirir.
- Her hamle ve tersi birbirini götürür.
- Bir diziyi ters sırada ters hamlelerle uygulamak başlangıç durumunu geri getirir.
- Bilinen örnek durumlarda dönüşlerin komşu yüzlere etkisi beklenen sonuçla eşleşir.
- Renk sayıları ve parçaların bütünlüğü korunur.

### Görsel ve etkileşim doğruluğu

- Altı yüz fareyle incelenebilir; renkler ve parça aralıkları okunaklıdır.
- Kamera hareketi küp durumunu değiştirmez.
- Animasyonda doğru katman doğru yönde hareket eder; bitişte görsel ve mantıksal durum eşleşir.
- Seri girilen hamleler kaybolmadan, sırayla ve birer kez uygulanır.
- Alttaki notasyon, animasyon ve geri alma aynı hamleye karşılık gelir.

### Fotoğraf aktarımı ve kullanıcı değerlendirmesi

- Kullanıcının doğruladığı 54 renk hücresi doğru yüz ve yönde sanal küpe aktarılır.
- Hatalı veya belirsiz girişler düzeltilebilir; geçersiz küp başlangıç olarak kabul edilmez.
- Fiziksel ve sanal küpte aynı deneme dizisi uygulandığında altı yüz eşleşir.
- Kullanıcı küpün görünümünü, fare davranışını, dönüş hızını ve notasyon yerleşimini değerlendirir; gerekli düzeltmeler demoda yapılır.

Demo bu ölçütler sağlandığında tamamlanmış sayılacak. Eğitim veya çözüm özelliklerinin tamamlanması Demo 1.0 için şart değildir.

## 6. Sonraki aşama: Algoritma kütüphanesi ve oynatıcı

Hedef, basitten ileriye bilinen küp algoritmalarını kapsayacak şekilde büyüyen bir kütüphane kurmaktır. “Tüm algoritmalar” uzun vadeli kapsam hedefidir; her teslimde eklenecek yöntemler, durumlar ve varyantlar ayrı bir katalogla belirlenecek.

### Her algoritmanın içeriği

- Adı, yöntemi, seviyesi ve hangi durumda kullanıldığı.
- Uygun başlangıç küpü ve tutuş yönü.
- Hamle notasyonu, aşama açıklamaları ve beklenen sonuç.
- Varsa alternatif uygulamalar ve kaynak bilgisi.

### Oynatıcı

- Seçilen algoritmayı uygun örnek küp üzerinde animasyonla uygular.
- Oynat, duraklat, tek hamle ileri/geri, başa dön ve hız ayarı sunar.
- Algoritmanın tamamını küpün altında gösterir; etkin hamleyi animasyonla eşzamanlı vurgular.
- Kamera açısını değiştirmeye izin verirken oynatma durumunu korur.
- Örnek durum ile kullanıcının kendi küpüne uygulama açıkça ayrılır; algoritmanın ön koşulları gösterilir.

Notasyon desteği önce altı yüzün normal, ters ve çift dönüşleriyle başlar. İleri algoritmalar eklendikçe orta katman, geniş katman ve bütün küp dönüşleri desteklenir. Bütün küp dönüşü ile kameranın etrafında dolaşması ayrı işlemler olarak modellenir.

## 7. Ürün yol haritası

| Aşama | Amaç | Temel özellikler |
| --- | --- | --- |
| Demo 1.0 | Model ve görselleştirmeyi doğrula | Fotoğraftan küp, fareyle inceleme, hamle animasyonu, altta notasyon |
| Algoritma oynatıcısı | Dizileri görerek incele | Katalog, uygun örnek durumlar, adım adım oynatma |
| Çözüm aracı | Mevcut küp için çözüm üret | Durum doğrulama, çözüm dizisi ve animasyon |
| Eğitim arayüzü | Çözümün nedenini öğret | Basitten ileriye dersler, aşama amaçları ve açıklamalar |
| Pratik arayüzü | Öğrenileni pekiştir | Hedefli alıştırmalar, ipuçları, tekrar ve ilerleme |

Çözüm dizisi üretmek ile öğretici açıklama üretmek ayrı ihtiyaçlardır. Eğitim aşaması, hamlelerin hangi parçaları neden değiştirdiğini ve önceki kazanımları nasıl koruduğunu anlatacak.

## 8. Teknik yapı ve geliştirme sırası

### Birbirinden ayrılacak sorumluluklar

- **Küp motoru:** Parça durumu, dönüşler, ters hamleler ve geçerlilik kontrolleri.
- **3B görünüm:** Kamera, renkler, parça geometrisi ve katman animasyonları.
- **Hamle yönetimi:** Klavye/düğme girdileri, komut sırası, geçmiş ve geri alma.
- **Notasyon alanı:** Motorla eşzamanlı hamle gösterimi; sonrasında algoritma oynatıcı bağlantısı.
- **Fotoğraf aktarımı:** Izgara ve renk okuma, yüz eşleme, yön ve kullanıcı düzeltmeleri.
- **Sonraki modüller:** Algoritma kataloğu, çözümleyici, dersler ve pratik hedefleri.

Küp durumu tek bir mantıksal kaynaktan yönetilecek. Görsel animasyonlar bu durumu yansıtacak; ileride algoritma oynatımı da aynı hamle mekanizmasını kullanacak.

### Demo geliştirme adımları

1. Ana ekranın basit görsel taslağını hazırlayıp küpün yerleşimini belirle.
2. Küp motorunu ve temel dönüş doğrulamalarını kur.
3. Fareyle incelenen 3B görünümü oluştur.
4. Hamle düğmeleri, önerilen kısayollar, animasyon ve alttaki notasyonu bağla.
5. Geri al, yeniden uygula, başlangıç görünümü ve durumuna dönüşü ekle.
6. Kılavuzlu fotoğraf aktarımı, düzeltme ve geçerlilik kontrollerini ekle.
7. Gerçek küple karşılaştırıp Demo 1.0 kabul ölçütlerini değerlendir.
8. Kullanıcı geri bildirimine göre görünüm ve kontrolleri düzelt; ardından algoritma oynatıcısına geç.

Teknoloji seçimi, fotoğraf işlemenin cihazda mı servis üzerinde mi yapılacağı ve sonraki sürümlerin ayrıntılı içerik katalogları geliştirme öncesinde ayrıca kararlaştırılacak.
