import { Guide } from './types';

// Helper to generate past dates
const daysAgo = (days: number) => Date.now() - (days * 24 * 60 * 60 * 1000);

export const guides: Guide[] = [
  {
    "id": "1",
    "title": "Sıfırdan Python ile Programlama",
    "slug": "sifirdan-python-rehberi",
    "category": "Yazılım",
    "difficulty": "Orta",
    "duration": "4 Hafta",
    "description": "Dünyanın en popüler yazılım dili Python'ı öğrenmeye nereden başlamalısınız? Kurulumdan ilk projeye eksiksiz yol haritası.",
    "imageUrl": "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&auto=format&fit=crop",
    "steps": [
      { "step_title": "Python Kurulumu ve IDE Seçimi", "step_content": "Python.org'dan son sürümü indirin. Kod yazmak için VS Code veya PyCharm kurun." },
      { "step_title": "Değişkenler ve Veri Tipleri", "step_content": "String, Integer, Float ve Boolean kavramlarını öğrenin. İlk 'Hello World' kodunuzu yazın." },
      { "step_title": "Döngüler ve Koşul Yapıları", "step_content": "If-else blokları, For ve While döngüleri ile program akışını kontrol etmeyi kavrayın." },
      { "step_title": "Fonksiyonlar ve Modüller", "step_content": "Tekrar eden kodları fonksiyonlara bölün. Hazır kütüphaneleri (Math, Random) içe aktarmayı öğrenin." },
      { "step_title": "İlk Proje: Sayı Tahmin Oyunu", "step_content": "Öğrendiklerinizi pekiştirmek için rastgele sayı üreten ve kullanıcının tahmin ettiği basit bir oyun yazın." }
    ],
    "related": ["modern-frontend-yol-haritasi", "seo-baslangic-rehberi"],
    "createdAt": daysAgo(120),
    "views": 1250
  },
  {
    "id": "2",
    "title": "Aralıklı Oruç (Intermittent Fasting) 101",
    "slug": "aralikli-oruc-rehberi",
    "category": "Sağlık",
    "difficulty": "Kolay",
    "duration": "Sürekli",
    "description": "Kilo vermek ve hücre yenilenmesi sağlamak için bilimsel temelli beslenme metodu. 16:8 kuralı nasıl uygulanır?",
    "imageUrl": "https://images.unsplash.com/photo-1547483238-2cbf881a559f?w=800&auto=format&fit=crop",
    "steps": [
      { "step_title": "Yeme Penceresini Belirleme", "step_content": "Günün 8 saati yemek yiyip, 16 saati aç kalacak şekilde saatlerinizi ayarlayın (Örn: 12:00 - 20:00)." },
      { "step_title": "Sıvı Tüketimi", "step_content": "Oruç saatlerinde şekersiz çay, sade kahve ve bol su tüketimi serbesttir ve metabolizmayı hızlandırır." },
      { "step_title": "İlk Öğün Seçimi", "step_content": "Orucu açarken karbonhidrat yerine protein ve sağlıklı yağlar (yumurta, avokado) tercih edin." },
      { "step_title": "Tutarlılık", "step_content": "Vücudun alışması için en az 21 gün boyunca saatlere sadık kalın." }
    ],
    "related": ["meditasyon-temelleri", "minimalizm-rehberi"],
    "createdAt": daysAgo(90),
    "views": 3400
  },
  {
    "id": "3",
    "title": "Temettü Emekliliği ve Borsa",
    "slug": "temettu-emekliligi",
    "category": "Finans",
    "difficulty": "Orta",
    "duration": "5+ Yıl",
    "description": "Finansal özgürlük için pasif gelir inşa edin. Bileşik getirinin gücüyle nasıl erken emekli olunur?",
    "imageUrl": "https://images.unsplash.com/photo-1611974765270-ca1258634369?w=800&auto=format&fit=crop",
    "steps": [
      { "step_title": "Yatırım Hesabı Açma", "step_content": "Bir banka veya aracı kurumdan yatırım hesabı açın. Komisyon oranlarını karşılaştırın." },
      { "step_title": "Şirket Analizi", "step_content": "Düzenli kar payı dağıtan, köklü ve büyüyen şirketleri (Temettü Aristokratları) belirleyin." },
      { "step_title": "Düzenli Alım ve Dolar Maliyet Ortalaması", "step_content": "Fiyata bakmaksızın her ay belirlediğiniz tutarda hisse alarak maliyeti ortalayın." },
      { "step_title": "Temettü Geri Yatırımı", "step_content": "Yatan kar paylarını harcamadan tekrar hisse senedine dönüştürerek bileşik getiriyi çalıştırın." }
    ],
    "related": ["pasif-gelir-yollari", "kisisel-butce-yonetimi"],
    "createdAt": daysAgo(60),
    "views": 890
  },
  {
    "id": "4",
    "title": "SEO Başlangıç Rehberi: Google'da Üst Sıraya Çıkın",
    "slug": "seo-baslangic-rehberi",
    "category": "Dijital Pazarlama",
    "difficulty": "İleri",
    "duration": "3 Ay",
    "description": "Web sitenizin organik trafiğini artırmak için bilmeniz gereken temel SEO (Arama Motoru Optimizasyonu) teknikleri.",
    "imageUrl": "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&auto=format&fit=crop",
    "steps": [
      { "step_title": "Anahtar Kelime Araştırması", "step_content": "Google Keyword Planner veya Ahrefs kullanarak hedef kitlenizin ne aradığını bulun." },
      { "step_title": "Site İçi (On-Page) SEO", "step_content": "Başlık etiketleri (H1, H2), meta açıklamalar ve URL yapısını anahtar kelimelerle optimize edin." },
      { "step_title": "Teknik SEO", "step_content": "Site hızını artırın, mobil uyumluluğu kontrol edin ve sitemap.xml dosyanızı oluşturun." },
      { "step_title": "Backlink İnşası", "step_content": "Otoriter sitelerden sitenize referans bağlantılar alarak güvenilirliğinizi artırın." }
    ],
    "related": ["sifirdan-python-rehberi", "modern-frontend-yol-haritasi"],
    "createdAt": daysAgo(45),
    "views": 1500
  },
  {
    "id": "5",
    "title": "Evde Monstera (Deve Tabanı) Bakımı",
    "slug": "monstera-bakimi",
    "category": "Hobi",
    "difficulty": "Kolay",
    "duration": "Sürekli",
    "description": "Evinizin havasını değiştirecek dev yapraklı Monstera bitkisi için adım adım bakım, sulama ve çoğaltma rehberi.",
    "imageUrl": "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=800&auto=format&fit=crop",
    "steps": [
      { "step_title": "Konumlandırma", "step_content": "Yarı gölge, doğrudan güneş almayan ama aydınlık bir köşe seçin." },
      { "step_title": "Sulama", "step_content": "Toprak kurumadan sulamayın. Haftada 1 kontrol edin." },
      { "step_title": "Nem Dengesi", "step_content": "Yapraklarına su püskürtün, tropikal ortamı sever." }
    ],
    "related": ["evde-kahve-demleme", "minimalizm-rehberi"],
    "createdAt": daysAgo(200),
    "views": 450
  },
  {
    "id": "6",
    "title": "Modern Frontend Yol Haritası",
    "slug": "modern-frontend-yol-haritasi",
    "category": "Yazılım",
    "difficulty": "İleri",
    "duration": "6 Ay",
    "description": "Güncel teknolojilerle (React, Tailwind, TypeScript) web geliştiricisi olma yolculuğu.",
    "imageUrl": "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800&auto=format&fit=crop",
    "steps": [
      { "step_title": "HTML & CSS & JS", "step_content": "Web'in temellerini sağlamlaştırın. ES6+ özelliklerini öğrenin." },
      { "step_title": "React Ekosistemi", "step_content": "Component yapısı, Hooks ve State yönetimini kavrayın." },
      { "step_title": "Next.js ve SSR", "step_content": "SEO uyumlu, hızlı web uygulamaları için Next.js öğrenin." }
    ],
    "related": ["sifirdan-python-rehberi", "seo-baslangic-rehberi"],
    "createdAt": daysAgo(30),
    "views": 2100
  },
  {
    "id": "7",
    "title": "Minimalizm: Azla Yaşama Sanatı",
    "slug": "minimalizm-rehberi",
    "category": "Yaşam",
    "difficulty": "Kolay",
    "duration": "1 Hafta",
    "description": "Eşyaların kölesi olmaktan kurtulun. Zihinsel ve fiziksel sadelik için temizlik rehberi.",
    "imageUrl": "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=800&auto=format&fit=crop",
    "steps": [
      { "step_title": "Gardırop Detoksu", "step_content": "Son 1 yıldır giymediğiniz her şeyi bağışlayın veya satın." },
      { "step_title": "Dijital Temizlik", "step_content": "Gereksiz uygulamaları silin, e-posta kutunuzu boşaltın." },
      { "step_title": "Satın Alma Kuralları", "step_content": "Bir şey almadan önce 24 saat bekleme kuralını uygulayın." }
    ],
    "related": ["aralikli-oruc-rehberi", "kisisel-butce-yonetimi"],
    "createdAt": daysAgo(10),
    "views": 670
  },
  {
    "id": "8",
    "title": "3. Dalga Kahve Demleme Teknikleri",
    "slug": "evde-kahve-demleme",
    "category": "Hobi",
    "difficulty": "Orta",
    "duration": "1 Gün",
    "description": "V60, Chemex veya French Press ile evde barista kalitesinde kahve nasıl demlenir?",
    "imageUrl": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop",
    "steps": [
      { "step_title": "Çekirdek Seçimi", "step_content": "Taze kavrulmuş, nitelikli (specialty) kahve çekirdekleri edinin." },
      { "step_title": "Öğütüm", "step_content": "Demleme ekipmanınıza uygun kalınlıkta kahveyi taze öğütün." },
      { "step_title": "Su Sıcaklığı", "step_content": "Kaynar su kullanmayın. 92-94 derece ideal sıcaklıktır." },
      { "step_title": "Demleme Oranı", "step_content": "Genel kural 1 gram kahve için 16 gram su (1:16) kullanmaktır." }
    ],
    "related": ["monstera-bakimi", "minimalizm-rehberi"],
    "createdAt": daysAgo(365),
    "views": 220
  },
  {
    "id": "9",
    "title": "Meditasyon ve Mindfulness Temelleri",
    "slug": "meditasyon-temelleri",
    "category": "Kişisel Gelişim",
    "difficulty": "Kolay",
    "duration": "Sürekli",
    "description": "Stres yönetimi ve zihinsel berraklık için günde 10 dakika meditasyon nasıl yapılır?",
    "imageUrl": "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop",
    "steps": [
      { "step_title": "Ortam Hazırlığı", "step_content": "Sessiz, rahatsız edilmeyeceğiniz bir köşe seçin." },
      { "step_title": "Odaklanma", "step_content": "Gözlerinizi kapatın ve sadece nefes alıp verişinize odaklanın." },
      { "step_title": "Düşünceleri Gözlemleme", "step_content": "Aklınıza düşünceler gelirse onları yargılamadan geçip gitmelerine izin verin." }
    ],
    "related": ["aralikli-oruc-rehberi", "minimalizm-rehberi"],
    "createdAt": daysAgo(500),
    "views": 4100
  },
  {
    "id": "10",
    "title": "Kişisel Bütçe Yönetimi ve Tasarruf",
    "slug": "kisisel-butce-yonetimi",
    "category": "Finans",
    "difficulty": "Kolay",
    "duration": "1 Ay",
    "description": "Gelir ve giderlerinizi kontrol altına alın, borçları kapatın ve birikime başlayın.",
    "imageUrl": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop",
    "steps": [
      { "step_title": "Gider Takibi", "step_content": "Bir ay boyunca harcadığınız her kuruşu not edin." },
      { "step_title": "50/30/20 Kuralı", "step_content": "Gelirin %50'si ihtiyaçlara, %30'u isteklere, %20'si birikime." },
      { "step_title": "Gereksiz Abonelikler", "step_content": "Kullanmadığınız dijital üyelikleri iptal edin." }
    ],
    "related": ["temettu-emekliligi", "minimalizm-rehberi"],
    "createdAt": daysAgo(5),
    "views": 150
  },
  {
    "id": "11",
    "title": "Pasif Gelir Yolları",
    "slug": "pasif-gelir-yollari",
    "category": "Finans",
    "difficulty": "Orta",
    "duration": "Değişken",
    "description": "Uyurken para kazanmak için dijital ürünler, e-kitaplar ve stok fotoğrafçılık.",
    "imageUrl": "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800&auto=format&fit=crop",
    "steps": [
      { "step_title": "Yeteneğinizi Keşfedin", "step_content": "Hangi konuda iyisiniz? Yazı yazmak, tasarım, fotoğraf?" },
      { "step_title": "Dijital Ürün Üretimi", "step_content": "Bir kez üretip sınırsız satabileceğiniz bir şablon veya e-kitap hazırlayın." },
      { "step_title": "Pazaryeri Seçimi", "step_content": "Etsy, Gumroad veya Udemy gibi platformlarda ürününüzü listeyin." }
    ],
    "related": ["temettu-emekliligi", "kisisel-butce-yonetimi"],
    "createdAt": daysAgo(2),
    "views": 55
  }
];
