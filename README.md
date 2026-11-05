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
- **Varlıklarım:** varlık ekleme, düzenleme ve silme. Her varlığın türü (Altın, Hisse, ETF, Yatırım Fonu, Döviz, Mevduat, Kripto, Diğer), kurumu ve notu tutulur.
- **Aylık Güncelleme:** bir ay seçilir ve tüm varlıkların o ayki değeri tek ekranda girilir. Alanlar önceki ayın değerleriyle hazır gelir; önceki aya göre değişim yazarken anlık hesaplanır.
- **Son bilinen değer kuralı:** bir ay için değeri girilmeyen varlık, en son girilen değeriyle sayılır. Elden çıkarılan varlık için 0 yazılır; varlık toplamdan ve dağılımlardan düşer.
- **Ayarlar:** verinin JSON dosyası olarak yedeklenmesi, yedekten doğrulamalı geri yükleme, örnek veri yükleme ve tüm verileri silme.
- **Türkçe sayı girişi:** `45.000`, `45000,50` veya `1.250.000 ₺` yazımlarının hepsi doğru okunur.
- Telefon ve masaüstü uyumlu arayüz.

## Kullanılan teknolojiler

| Teknoloji | Kullanım amacı |
|---|---|
| [React](https://react.dev) 19 | Arayüz bileşenleri |
| [Vite](https://vite.dev) 8 | Geliştirme sunucusu ve derleme |
| [Tailwind CSS](https://tailwindcss.com) 4 | Stil |
| [Recharts](https://recharts.org) 3 | Çizgi grafik |
| LocalStorage | Verinin tarayıcıda saklanması (sunucu / veritabanı yok) |
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
│   └── Settings.jsx        Ayarlar: yedekleme, örnek veri, sıfırlama
├── components/
│   ├── AssetForm.jsx       Varlık ekleme / düzenleme formu
│   ├── SuggestInput.jsx    Öneri listeli metin kutusu (kurum alanı)
│   └── TypeBadge.jsx       Renkli tür rozeti
└── lib/
    ├── usePortfolio.js     Tüm verinin tutulduğu ve değiştirildiği yer
    ├── storage.js          LocalStorage okuma/yazma ve yedek doğrulama
    ├── analytics.js        Aylık toplamlar ve dağılım hesapları
    ├── format.js           Para, yüzde, tarih biçimleri ve Türkçe sayı okuma
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
  }
}
```

- **assets:** kullanıcının sahip olduğu yatırımlar.
- **records:** her ay için her varlığın o ayki toplam değeri (₺). Ay anahtarı `YYYY-AA` biçimindedir.

Veri sadece kullanıldığı tarayıcıda durur. Başka bir cihaza taşımak veya kaybetmemek için **Ayarlar → Yedeği indir** kullanılır.

## Yapay zekanın kullanımı

Proje, VS Code içinde **Claude Code** eklentisiyle (model: Claude Opus 5.5) geliştirildi. Kodun tamamı yapay zekaya yazdırıldı. Proje sahibi fikri, gereksinimleri ve kararları belirledi, her aşamayı tarayıcıda test etti ve bulduğu hataları bildirdi. Yapay zekadan her adımda neyi neden yaptığını açıklaması istendi.

| Aşama | Yapay zeka nasıl kullanıldı |
|---|---|
| **Fikir** | Gemini ile proje fikirleri tartışıldı. "Yatırım ve portföy takipçisi" fikri seçildi ve kişisel ihtiyaca göre şekillendirildi. |
| **Planlama** | Claude'a proje yönergesi ve fikir verilerek bir yol haritası istendi. Teknoloji seçimi (React + Vite, Tailwind, Recharts), LocalStorage'ın ne olduğu ve neden metin dosyası yerine kullanıldığı, veri modeli, ekranlar ve aşamalar birlikte planlandı. |
| **Kurulum** | Claude, Vite projesini oluşturdu, Tailwind ve Recharts'ı kurdu, Git deposunu başlattı ve GitHub Pages için otomatik yayın iş akışını yazdı. |
| **Geliştirme** | Bileşenler aşama aşama üretildi: varlık yönetimi → aylık güncelleme → panel ve grafikler → yedekleme ve örnek veri. "Son bilinen değer" kuralı ve pasta grafik yerine bölümlü çubuk kullanımı gibi tasarım kararları gerekçeleriyle önerildi ve onaylandı. Grafik renkleri renk körlüğü testinden geçirildi. |
| **Hata ayıklama** | Klasör adındaki `;` yüzünden `vite` komutunun bulunamaması teşhis edilip çözüldü. Kullanıcının bildirdiği "kurum öneri listesinin yanlış yerde açılması" hatası, tarayıcının `<datalist>` özelliğinin Windows ekran ölçeklendirmesindeki sorununa bağlanıp kendi bileşenle değiştirildi. Zaman aşımına uğrayan GitHub Pages yayını, action sürümleri güncellenerek düzeltildi. Ekran görüntüleri incelenerek animasyon, yüzde biçimi ve eksen etiketi sorunları bulundu ve giderildi. |
| **Doğrulama** | Üretilen kod her aşamada derlendi ve linter'dan geçirildi. Sayı okuma, aylık toplam ve yedek doğrulama fonksiyonları örnek verilerle test edildi. Proje sahibi her aşamayı tarayıcıda elle test etti. |
| **Dokümantasyon** | Bu README ve ekran görüntüleri Claude tarafından hazırlandı. |

Kullanılan istemlerden örnekler:

- *"Bir yatırım yönetim sitesi yapmak istiyorum. İnsanlar birden farklı bankalarda onlarca çeşit yatırıma sahipler… Toplam parasını görsün, grafiklerle artışı görsün, yatırım dağılımını görsün. Basit başlayalım, önce bir plan yap."*
- *"Kurum/banka kısmında yazdıktan sonra öneri listesi textbox'un altında değil, solda bozuk bir şekilde çıkıyor."*
- *"4-5 tane varsayılan veri yükleyelim; her aşamada sıfırdan değer giriyorum."*

## Yol haritası

- [ ] Alış maliyeti ve kâr/zarar takibi
- [ ] Döviz cinsinden varlıklar
- [ ] Karanlık mod
- [ ] Birden fazla profil
