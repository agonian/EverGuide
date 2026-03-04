
import React from 'react';
import { X, Shield, FileText, Info, Mail } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface LegalModalProps {
  type: 'privacy' | 'terms' | 'about' | 'contact';
  onClose: () => void;
}

const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  const { settings } = useApp();
  const siteName = settings.siteName || "Evergreen Rehber";

  const getTitle = () => {
      switch(type) {
          case 'privacy': return "Gizlilik Politikası";
          case 'terms': return "Kullanım Şartları";
          case 'about': return "Hakkımızda";
          case 'contact': return "İletişim";
      }
  };

  const getIcon = () => {
      switch(type) {
          case 'privacy': return <Shield className="text-green-600" size={24} />;
          case 'terms': return <FileText className="text-indigo-600" size={24} />;
          case 'about': return <Info className="text-blue-500" size={24} />;
          case 'contact': return <Mail className="text-orange-500" size={24} />;
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 rounded-t-2xl sticky top-0 z-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </h2>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto text-slate-600 dark:text-slate-300 text-sm leading-relaxed space-y-6">
          {type === 'privacy' && (
            <>
              <p>Son Güncelleme: {new Date().toLocaleDateString()}</p>
              <p><strong>{siteName}</strong> ("biz", "bizim" veya "site") olarak, ziyaretçilerimizin gizliliğine önem veriyoruz. Bu Gizlilik Politikası, web sitemizi kullandığınızda ne tür bilgilerin toplandığını ve bu bilgilerin nasıl kullanıldığını açıklar.</p>
              
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">1. Kayıt Dosyaları (Log Files)</h3>
              <p>Birçok standart web sunucusu gibi {siteName} de istatistiksel amaçlı log dosyaları kaydı tutar. Bu dosyalar; IP adresiniz, internet servis sağlayıcınız, tarayıcınızın özellikleri, işletim sisteminiz ve siteye giriş-çıkış sayfalarınız gibi standart bilgileri içerir. Log dosyaları kesinlikle istatistiksel amaçlar dışında kullanılmamakta ve mahremiyetinizi ihlal etmemektedir. Bu bilgiler kişisel kimliğinizle ilişkilendirilmemektedir.</p>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white">2. Çerezler (Cookies)</h3>
              <p>"Cookie - Çerez" kelimesi, web sayfası sunucusunun bilgisayarınızın hard diskine yerleştirdiği ufak bir metin dosyasını tanımlamak için kullanılmaktadır. Sitemizin bazı bölümlerinde kullanıcı kolaylığı sağlamak için çerez kullanılıyor olabilir. Ayrıca sitede mevcut bulunan reklamlar aracılığıyla, reklam verilerin toplanması için cookie ve web beacon kullanılıyor olabilir. Bu tamamen sizin izninizle gerçekleşiyor olup, isteğiniz dahilinde internet tarayıcınızın ayarlarını değiştirerek bunu engellemeniz mümkündür.</p>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white">3. Google AdSense ve Çift Tıklama DART Çerezi</h3>
              <p>Google, üçüncü taraf satıcı olarak sitemizde reklam yayınlamak için çerezlerden yararlanır. Google, DART çerezlerini kullanarak, ziyaretçilerimize sitemize ve internetteki diğer sitelere yaptıkları ziyaretlere dayalı reklamlar sunar. Kullanıcılar, Google reklam ve içerik ağı gizlilik politikasını ziyaret ederek DART çerezinin kullanılmasını engelleyebilirler. {siteName}, Google Adsense reklam sistemini kullanmaktadır. Bu sistem Google tarafından içerik için AdSense reklamlarının görüntülendiği yayıncı web sitelerinde sunulan reklamlarda kullanılan DoubleClick DART çerezini içerir.</p>
            </>
          )}

          {type === 'terms' && (
            <>
               <p>Son Güncelleme: {new Date().toLocaleDateString()}</p>
               <p>Lütfen <strong>{siteName}</strong> ("Site") web sitesini kullanmadan önce bu Kullanım Şartları'nı dikkatlice okuyun.</p>

               <h3 className="text-lg font-bold text-slate-900 dark:text-white">1. Şartların Kabulü</h3>
               <p>Siteye erişerek veya siteyi kullanarak, bu şartlar ve koşullarla bağlı olmayı kabul edersiniz. Bu şartların herhangi bir kısmını kabul etmiyorsanız, siteyi kullanmamalısınız.</p>

               <h3 className="text-lg font-bold text-slate-900 dark:text-white">2. İçerik Kullanımı</h3>
               <p>Bu sitedeki tüm içerikler (metinler, grafikler, görseller, rehberler) yalnızca genel bilgilendirme ve eğitim amaçlıdır. {siteName}, sağlanan bilgilerin kesinliği, eksiksizliği veya güncelliği konusunda garanti vermez. Sitedeki bilgileri uygulamak tamamen kullanıcının kendi sorumluluğundadır.</p>

               <h3 className="text-lg font-bold text-slate-900 dark:text-white">3. Fikri Mülkiyet Hakları</h3>
               <p>Sitedeki içerikler telif hakkı ve diğer fikri mülkiyet yasaları ile korunmaktadır. Önceden yazılı izin alınmaksızın bu sitedeki materyallerin kopyalanması, dağıtılması veya ticari amaçla kullanılması yasaktır.</p>
            </>
          )}

          {type === 'about' && (
             <div className="space-y-4">
                 <p className="text-lg leading-relaxed">
                     <strong>{siteName}</strong>, hayat boyu öğrenmeyi ilke edinmiş bireyler için tasarlanmış, her zaman güncel ("evergreen") ve nitelikli içerik sunmayı hedefleyen modern bir rehber platformudur.
                 </p>
                 <p>
                     İnternet dünyasındaki bilgi kirliliğinden arınmış, "Nasıl yapılır?" sorusuna en net, en pratik ve adım adım uygulanabilir cevapları vermek için buradayız. Yazılımdan finansa, sağlıktan kişisel gelişime kadar geniş bir yelpazede, zamansız bilgileri derliyor ve size sunuyoruz.
                 </p>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-4">Misyonumuz</h3>
                 <p>Karmaşık konuları basitleştirerek herkesin anlayabileceği ve uygulayabileceği bir formata dönüştürmek. Öğrenme sürecini bir yük olmaktan çıkarıp, keyifli bir yolculuk haline getirmek.</p>
             </div>
          )}

          {type === 'contact' && (
             <div className="space-y-4">
                 <p>Bizimle iletişime geçmek, öneri, şikayet veya iş birliği taleplerinizi iletmek için aşağıdaki kanalları kullanabilirsiniz.</p>
                 
                 <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col gap-4">
                     <div className="flex items-center gap-3">
                         <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                            <Mail className="text-brand-600" />
                         </div>
                         <div>
                             <h4 className="font-bold text-slate-900 dark:text-white">E-Posta</h4>
                             <a href="mailto:info@evergreenrehber.com" className="text-brand-600 hover:underline">info@evergreenrehber.com</a>
                         </div>
                     </div>
                     <p className="text-xs text-slate-500 mt-2">* E-postalarınıza genellikle 24 saat içinde dönüş yapıyoruz.</p>
                 </div>
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-2xl">
          <button onClick={onClose} className="w-full bg-brand-900 dark:bg-slate-700 text-white py-3 rounded-xl font-bold hover:bg-brand-800 transition-colors shadow-lg">
            {type === 'contact' ? 'Kapat' : 'Okudum, Anladım'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;
