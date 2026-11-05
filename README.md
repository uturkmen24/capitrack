# CapiTrack

**Tüm yatırımların, tek yerde.**

İnsanların birikimleri çoğu zaman farklı bankalara ve aracı kurumlara dağılmış durumdadır: bir bankada altın hesabı, diğerinde hisse senetleri, bir başkasında vadeli mevduat… CapiTrack, bu yatırımların hepsini tek bir panelde toplar. Kullanıcı her ay varlıklarının güncel değerini girer; uygulama toplam varlığı, zaman içindeki değişimi ve varlıkların türlere ve kurumlara göre dağılımını grafiklerle gösterir.

🔗 **Canlı site:** https://uturkmen24.github.io/capitrack/

🧪 **Örnek veriyle dene:** https://uturkmen24.github.io/capitrack/?demo

![CapiTrack paneli](docs/panel.png)

<details>
<summary>Telefon görünümü</summary>

<img src="docs/mobil.png" alt="CapiTrack telefon görünümü" width="320" />

</details>

## Özellikler

- **Panel:** toplam varlık, geçen aya göre ve başlangıçtan beri değişim (₺ ve %), aylara göre toplam değer çizgi grafiği, türe göre ve kuruma göre dağılım.
- **Çubuk / Pasta görünümü:** türe göre dağılım, bölümlü çubuk veya halka (pasta) grafik olarak gösterilebilir. Pastada bir dilimin ya da listedeki bir türün üzerine gelince halkanın ortasında o türün tutarı ve payı görünür.
- **TL / Dolar:** toplam varlığa tıklayınca TL ile dolar arasında geçiş yapılır. Kur, ücretsiz bir servisten (Avrupa Merkez Bankası referans kuru) alınır ve 6 saat önbellekte tutulur; internet yoksa en son alınan kur kullanılır.
- **Gizlilik modu:** üst menüdeki göz ikonu, kafe veya kütüphane gibi ortak alanlarda tüm tutarları tek tıkla `₺***,**` olarak gizler. Değer giriş kutuları bulanıklaşır, kutuya tıklayınca netleşir. Tercih hatırlanır.
- **Hedef:** bir birikim hedefi (ör. ev peşinatı) belirlenir; portföyün hedefe oranı ilerleme çubuğuyla gösterilir. Aylık ekleme ve beklenen yıllık reel getiriyle, bileşik getiri hesabı yapılarak hedefe kaç ay sonra ulaşılacağı tahmin edilir.
- **Varlıklarım:** varlık ekleme, düzenleme ve silme. Her varlığın türü (Altın, Hisse, ETF, Yatırım Fonu, Döviz, Mevduat, Kripto, Diğer), kurumu ve notu tutulur.
- **Aylık Güncelleme:** bir ay seçilir ve tüm varlıkların o ayki değeri tek ekranda girilir. Alanlar önceki ayın değerleriyle hazır gelir; önceki aya göre değişim yazarken anlık hesaplanır.
- **Son bilinen değer kuralı:** bir ay için değeri girilmeyen varlık, en son girilen değeriyle sayılır. Elden çıkarılan varlık için 0 yazılır; varlık toplamdan ve dağılımlardan düşer.
- **Ayarlar:** verinin JSON dosyası olarak yedeklenmesi, yedekten doğrulamalı geri yükleme, örnek veri yükleme ve tüm verileri silme.
- **Excel'e aktarma:** veriler biçimlendirilmiş bir `.xlsx` dosyası olarak indirilir. Dosyada dört sayfa bulunur: *Aylık Tablo* (varlık × ay, formüllü toplam satırı), *Dağılım* (son ayın türe ve kuruma göre payları), *Tüm Kayıtlar* (filtrelenebilir liste) ve *Varlıklar*.
- **Türkçe sayı girişi:** `45.000`, `45000,50` veya `1.250.000 ₺` yazımlarının hepsi doğru okunur.
- Telefon ve masaüstü uyumlu arayüz.

## Kullanılan teknolojiler

| Teknoloji | Kullanım amacı |
|---|---|
| [React](https://react.dev) 19 | Arayüz bileşenleri |
| [Vite](https://vite.dev) 8 | Geliştirme sunucusu ve derleme |
| [Tailwind CSS](https://tailwindcss.com) 4 | Stil |
| [Recharts](https://recharts.org) 3 | Çizgi ve pasta grafik |
| [ExcelJS](https://github.com/exceljs/exceljs) 4 | Excel (.xlsx) dosyası üretimi; sadece indirme butonuna basılınca yüklenir |
| [Frankfurter](https://frankfurter.dev) / [ExchangeRate-API](https://www.exchangerate-api.com) | Dolar/TL kuru (ücretsiz, API anahtarı gerektirmez) |
| LocalStorage | Verinin ve tercihlerin tarayıcıda saklanması (sunucu / veritabanı yok) |
| GitHub Actions + GitHub Pages | Her push'ta otomatik derleme ve yayın |

## Kurulum

Gereksinimler: [Node.js](https://nodejs.org) 20.19 veya üzeri ve [Git](https://git-scm.com).

```bash
git clone https://github.com/uturkmen24/capitrack.git
cd capitrack
npm install
npm run dev
```

Ardından tarayıcıda `http://localhost:5173` adresini aç.

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusunu başlatır; kod değiştikçe sayfa kendini yeniler |
| `npm run build` | Yayına hazır dosyaları `dist/` klasörüne üretir |
| `npm run preview` | Derlenmiş siteyi yerelde önizler |
| `npm run lint` | Kodu olası hatalara karşı denetler (oxlint) |

> **Not:** `package.json` içindeki komutlar Vite'ı `node node_modules/vite/bin/vite.js` şeklinde doğrudan çağırır. Windows'ta klasör yolunda noktalı virgül (`;`) bulunduğunda `vite` komutu bulunamadığı için bu yol tercih edildi; diğer sistemlerde de aynı şekilde çalışır.

## Proje yapısı

```
src/
├── App.jsx                 Üst menü ve sekmeler
├── pages/
│   ├── Dashboard.jsx       Panel: özet kartları ve grafikler
│   ├── Assets.jsx          Varlıklarım
│   ├── MonthlyUpdate.jsx   Aylık Güncelleme
│   └── Settings.jsx        Ayarlar: yedekleme, Excel, örnek veri, sıfırlama
├── components/
│   ├── TotalTile.jsx       Toplam varlık kartı (TL / Dolar geçişi)
│   ├── GoalCard.jsx        Hedef kartı ve hedef formu
│   ├── TypeDistribution.jsx Türe göre dağılım (çubuk / pasta)
│   ├── AssetForm.jsx       Varlık ekleme / düzenleme formu
│   ├── SuggestInput.jsx    Öneri listeli metin kutusu (kurum alanı)
│   └── TypeBadge.jsx       Renkli tür rozeti
└── lib/
    ├── usePortfolio.js     Tüm verinin tutulduğu ve değiştirildiği yer
    ├── storage.js          LocalStorage okuma/yazma ve yedek doğrulama
    ├── analytics.js        Aylık toplamlar ve dağılım hesapları
    ├── goal.js             Bileşik getiri ve hedefe ulaşma süresi hesabı
    ├── fx.js               Dolar/TL kurunun alınması ve önbelleklenmesi
    ├── exportExcel.js      Excel dosyasının oluşturulması
    ├── prefs.js            Tercihlerin hatırlanması (gizlilik, para birimi, görünüm)
    ├── format.js           Para, yüzde, tarih biçimleri, gizlilik maskesi, Türkçe sayı okuma
    ├── constants.js        Yatırım türleri ve renkleri
    └── demoData.js         Örnek portföy
```

## Veri modeli

Tüm veri tarayıcıda `capitrack:data` anahtarı altında tek bir JSON nesnesi olarak saklanır:

```json
{
  "version": 1,
  "assets": [
    { "id": "…", "name": "Gram Altın", "type": "altin", "institution": "Ziraat Bankası", "note": "25 gram" }
  ],
  "records": {
    "2026-10": { "<varlık id>": { "value": 83500 } },
    "2026-11": { "<varlık id>": { "value": 86000 } }
  },
  "goal": { "name": "Ev peşinatı", "target": 1000000, "monthly": 5000, "annualReturn": 0.1 }
}
```

- **assets:** kullanıcının sahip olduğu yatırımlar.
- **records:** her ay için her varlığın o ayki toplam değeri (₺). Ay anahtarı `YYYY-AA` biçimindedir.
- **goal:** birikim hedefi (tutar, aylık ekleme, yıllık reel getiri oranı) ya da hedef yoksa `null`.

Gizlilik modu, para birimi ve grafik görünümü gibi tercihler portföy verisinden ayrı anahtarlarda (`capitrack:privacy` vb.) tutulur ve yedeğe dahil edilmez.

### Hedef hesabı

Hedefe ulaşma süresi, her ay birikimin getiri kadar büyüdüğü ve üstüne aylık ekleme yapıldığı varsayımıyla hesaplanır:

```
FV(n) = P·(1+r)ⁿ + C·((1+r)ⁿ − 1) / r        →        n = ln((H·r + C) / (P·r + C)) / ln(1+r)
```

`P` bugünkü portföy, `C` aylık ekleme, `H` hedef ve `r` aylık getiri oranıdır. Yıllık oran aylığa bileşik olarak çevrilir: `r = (1 + yıllık)^(1/12) − 1` (yıllık %10 → aylık yaklaşık %0,797).

Veri sadece kullanıldığı tarayıcıda durur. Başka bir cihaza taşımak veya kaybetmemek için **Ayarlar → Yedeği indir** kullanılır.

## Yapay zekanın kullanımı

Proje, VS Code içinde **Claude Code** eklentisiyle (model: Claude Opus 5.5) geliştirildi. Kodun tamamı yapay zekaya yazdırıldı. Proje sahibi fikri, gereksinimleri ve kararları belirledi, her aşamayı tarayıcıda test etti ve bulduğu hataları bildirdi. Yapay zekadan her adımda neyi neden yaptığını açıklaması istendi.

| Aşama | Yapay zeka nasıl kullanıldı |
|---|---|
| **Fikir** | Gemini ile proje fikirleri tartışıldı. "Yatırım ve portföy takipçisi" fikri seçildi ve kişisel ihtiyaca göre şekillendirildi. |
| **Planlama** | Claude'a proje yönergesi ve fikir verilerek bir yol haritası istendi. Teknoloji seçimi (React + Vite, Tailwind, Recharts) ve aşamalar birlikte planlandı. |
| **Kurulum** | Claude, Vite projesini oluşturdu, Tailwind ve Recharts'ı kurdu, Git deposunu başlattı ve GitHub Pages için otomatik yayın iş akışını yazdı. |
| **Geliştirme** | Bileşenler aşama aşama üretildi: varlık yönetimi → aylık güncelleme → panel ve grafikler → yedekleme ve örnek veri. "Son bilinen değer" kuralı ve dağılım için bölümlü çubuk kullanımı gibi tasarım kararları gerekçeleriyle önerildi ve onaylandı. Grafik renkleri renk körlüğü testinden geçirildi. |
| **Yeni özellikler** | Temel uygulama bittikten sonra proje sahibinin istediği özellikler eklendi: çubuk / pasta görünüm seçici, TL / Dolar geçişi, gizlilik modu, Excel'e aktarma ve bileşik getirili hedef hesabı. Kur servisleri önceden test edilip tarayıcıdan erişime izin verdikleri doğrulandı. Hedef formülü, hedefe ulaşılan ay ile bir önceki ayın birikimi karşılaştırılarak kontrol edildi. |
| **Hata ayıklama** | Klasör adındaki `;` yüzünden `vite` komutunun bulunamaması teşhis edilip çözüldü. Kullanıcının bildirdiği "kurum öneri listesinin yanlış yerde açılması" hatası, tarayıcının `<datalist>` özelliğinin Windows ekran ölçeklendirmesindeki sorununa bağlanıp kendi bileşenle değiştirildi. Zaman aşımına uğrayan GitHub Pages yayını, action sürümleri güncellenerek düzeltildi. Ekran görüntüleri incelenerek animasyon, yüzde biçimi ve eksen etiketi sorunları bulundu ve giderildi. Kullanıcının bildirdiği "pasta grafikte yazıların üst üste binmesi" sorunu, ipucu kutusu yerine halkanın ortasında bilgi gösterilerek; "grafiğe tıklayınca çıkan çerçeve" sorunu ise fare tıklamasında odak çerçevesi gizlenip klavye odağında korunarak çözüldü. |
| **Doğrulama** | Üretilen kod her aşamada derlendi ve linter'dan geçirildi. Sayı okuma, aylık toplam, yedek doğrulama ve hedef hesabı fonksiyonları örnek verilerle test edildi. Arayüz, otomatik kontrol edilen bir tarayıcıda (Edge + Puppeteer) butonlara tıklanarak denendi; indirilen Excel dosyası hücre hücre okunup kontrol edildi. Proje sahibi her aşamayı tarayıcıda elle test etti. |
| **Dokümantasyon** | Bu README ve ekran görüntüleri Claude tarafından hazırlandı. |
