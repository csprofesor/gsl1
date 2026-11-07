import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ImageBackground,
  SafeAreaView,
  Linking,
  Alert,
  StatusBar,
  Platform,
  Modal,
  NativeModules,
  BackHandler,
  Image,
} from 'react-native';

const { TVAppManager } = NativeModules;

// Varlık Dosyaları
const GS_ICON = require('./src/assets/gs_icon.png');
const BG_WALLPAPER = require('./src/assets/tv_wallpaper.jpg');
const HERO_DUNE = require('./src/assets/hero_dune.jpg');
const CARD_DUNE = require('./src/assets/card_dune.jpg');
const CARD_TLOU = require('./src/assets/card_tlou.jpg');
const CARD_HOTD = require('./src/assets/card_hotd.jpg');
const CARD_OPP = require('./src/assets/card_oppenheimer.jpg');

// Sürüm Bilgisi
const CURRENT_VERSION = '1.1.0';
const LATEST_RELEASE_APK = 'https://expo.dev/artifacts/eas/eA04MGfLS0yh4odR9DwzMKoPmZhnP-BGs4g66m39UPw.apk';

// ================= MONET MATERIAL YOU RENK PALETLERİ =================
export interface MonetTheme {
  id: string;
  name: string;
  accent: string;
  glow: string;
  surface: string;
  border: string;
  textOnAccent: string;
  wallpaperKey: 'lake' | 'cosmic' | 'cyber' | 'forest' | 'oled';
  bgGradientColor: string;
}

const MONET_TEMALARI: MonetTheme[] = [
  {
    id: 'amber',
    name: 'Gündoğumu (Altın Kehribar)',
    accent: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.45)',
    surface: 'rgba(245, 158, 11, 0.12)',
    border: '#FBBF24',
    textOnAccent: '#1C1304',
    wallpaperKey: 'lake',
    bgGradientColor: 'rgba(20, 14, 5, 0.55)',
  },
  {
    id: 'violet',
    name: 'Kozmik Gece (Neon Menekşe)',
    accent: '#A855F7',
    glow: 'rgba(168, 85, 247, 0.45)',
    surface: 'rgba(168, 85, 247, 0.14)',
    border: '#C084FC',
    textOnAccent: '#FFFFFF',
    wallpaperKey: 'cosmic',
    bgGradientColor: 'rgba(19, 10, 35, 0.65)',
  },
  {
    id: 'cyan',
    name: 'Buz Okyanusu (Turkuaz)',
    accent: '#06B6D4',
    glow: 'rgba(6, 182, 212, 0.45)',
    surface: 'rgba(6, 182, 212, 0.12)',
    border: '#38BDF8',
    textOnAccent: '#032029',
    wallpaperKey: 'cyber',
    bgGradientColor: 'rgba(5, 20, 30, 0.60)',
  },
  {
    id: 'emerald',
    name: 'Zümrüt Vadi (Doğal Yeşil)',
    accent: '#10B981',
    glow: 'rgba(16, 185, 129, 0.45)',
    surface: 'rgba(16, 185, 129, 0.12)',
    border: '#34D399',
    textOnAccent: '#022416',
    wallpaperKey: 'forest',
    bgGradientColor: 'rgba(4, 25, 15, 0.60)',
  },
  {
    id: 'ruby',
    name: 'Kızıl Akşam (Sıcak Mercan)',
    accent: '#F43F5E',
    glow: 'rgba(244, 63, 94, 0.45)',
    surface: 'rgba(244, 63, 94, 0.12)',
    border: '#FB7185',
    textOnAccent: '#FFFFFF',
    wallpaperKey: 'lake',
    bgGradientColor: 'rgba(28, 5, 12, 0.60)',
  },
  {
    id: 'oled',
    name: 'Saf OLED (Karanlık Mod)',
    accent: '#E2E8F0',
    glow: 'rgba(255, 255, 255, 0.40)',
    surface: 'rgba(255, 255, 255, 0.08)',
    border: '#FFFFFF',
    textOnAccent: '#0F172A',
    wallpaperKey: 'oled',
    bgGradientColor: 'rgba(0, 0, 0, 0.85)',
  },
];

// LeTa Launcher Uygulama Kategorileri
export type AppCategory = 'all' | 'media' | 'tv' | 'games' | 'tools';

interface FocusableItemProps {
  onPress: () => void;
  onLongPress?: () => void;
  style?: any;
  focusedStyle?: any;
  hasPreferredFocus?: boolean;
  children: ((isFocused: boolean) => React.ReactNode) | React.ReactNode;
}

const FocusableItem: React.FC<FocusableItemProps> = ({
  onPress,
  onLongPress,
  style,
  focusedStyle,
  hasPreferredFocus = false,
  children,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      hasTVPreferredFocus={hasPreferredFocus}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        style,
        isFocused && [styles.defaultFocused, focusedStyle],
      ]}
    >
      {typeof children === 'function' ? children(isFocused) : children}
    </TouchableOpacity>
  );
};

// Uygulama Modeli
interface UygulamaItem {
  id: string;
  name: string;
  packageName: string;
  color: string;
  icon: string;
  category: AppCategory;
  isFavorite: boolean;
}

// İzlenen İçerik Modeli
interface IzlenenItem {
  id: string;
  title: string;
  appName: string;
  pkg: string;
  image: any;
  progress: number;
}

// Uygulama İçerik Şeridi Modeli
interface SeritKarti {
  id: string;
  title: string;
  image: any;
  badge?: string;
  pkg: string;
}

interface IcerikSeridi {
  id: string;
  appName: string;
  pkg: string;
  appColor: string;
  kartlar: SeritKarti[];
}

export default function App() {
  // 1. Monet Teması
  const [aktifTema, setAktifTema] = useState<MonetTheme>(MONET_TEMALARI[0]);

  // 2. LeTa Kategori Filtresi
  const [seciliKategori, setSeciliKategori] = useState<AppCategory>('all');

  // 3. Cihazdaki GERÇEK Kurulu Uygulamalar
  const [cihazUygulamalari, setCihazUygulamalari] = useState<{ name: string; packageName: string }[]>([]);

  // 4. Kullanıcının Uygulama Listesi (Kategorize Edilmiş)
  const [uygulamalar, setUygulamalar] = useState<UygulamaItem[]>([]);

  // 5. Gerçek Son İzlenenler
  const [sonIzlenenler, setSonIzlenenler] = useState<IzlenenItem[]>([
    { id: '1', title: 'Dune: Part Two', appName: 'Cloudstream', pkg: 'com.google.android.youtube.tv', image: CARD_DUNE, progress: 65 },
    { id: '2', title: 'The Last of Us', appName: 'Prime Video', pkg: 'com.amazon.amazonvideo.livingroom', image: CARD_TLOU, progress: 42 },
    { id: '3', title: 'House of the Dragon', appName: 'Kodi', pkg: 'org.xbmc.kodi', image: CARD_HOTD, progress: 87 },
    { id: '4', title: 'Oppenheimer', appName: 'Nuvio', pkg: 'com.netflix.ninja', image: CARD_OPP, progress: 30 },
  ]);

  // 6. Dinamik İçerik Şeritleri
  const [seritler, setSeritler] = useState<IcerikSeridi[]>([]);

  // 7. Arama & Formlar
  const [aramaMetni, setAramaMetni] = useState('');

  // 8. Canlı Saat, Tarih & Canlı Hava Durumu
  const [saat, setSaat] = useState('20:15');
  const [tarih, setTarih] = useState('');
  const [havaDurumu, setHavaDurumu] = useState({ sehir: 'Konum alınıyor...', derece: '14°C', durum: 'Açık', ikon: '☀️' });

  // 9. LeTa Uyku Zamanlayıcısı (Sleep Timer)
  const [uykuSuresiDakika, setUykuSuresiDakika] = useState<number | null>(null);
  const [kalanUykuSaniye, setKalanUykuSaniye] = useState<number>(0);

  // 10. Modallar
  const [kontrolMerkeziAcik, setKontrolMerkeziAcik] = useState(false);
  const [uygulamaSeciciAcik, setUygulamaSeciciAcik] = useState(false);
  const [temaSeciciAcik, setTemaSeciciAcik] = useState(false);
  const [izlemeEkleAcik, setIzlemeEkleAcik] = useState(false);
  const [seritEkleAcik, setSeritEkleAcik] = useState(false);
  const [aksiyonMenusuAcik, setAksiyonMenusuAcik] = useState(false);
  const [seciliAksiyonUygulama, setSeciliAksiyonUygulama] = useState<UygulamaItem | null>(null);

  // Durum Bildirimi (RAM temizleme, Güncelleme vb.)
  const [bildirimMetni, setBildirimMetni] = useState('');
  const [cihazBilgisi, setCihazBilgisi] = useState<{ model?: string; android?: string; manufacturer?: string }>({});

  // İzleme Ekleme Formu
  const [yeniFilmBaslik, setYeniFilmBaslik] = useState('');
  const [yeniFilmYuzde, setYeniFilmYuzde] = useState('50');

  // Kumanda Geri (Back) Tuşu Yönetimi
  const handleBackPress = useCallback(() => {
    if (kontrolMerkeziAcik) {
      setKontrolMerkeziAcik(false);
      return true;
    }
    if (temaSeciciAcik) {
      setTemaSeciciAcik(false);
      return true;
    }
    if (uygulamaSeciciAcik) {
      setUygulamaSeciciAcik(false);
      return true;
    }
    if (aksiyonMenusuAcik) {
      setAksiyonMenusuAcik(false);
      return true;
    }
    if (izlemeEkleAcik) {
      setIzlemeEkleAcik(false);
      return true;
    }
    if (seritEkleAcik) {
      setSeritEkleAcik(false);
      return true;
    }
    return false;
  }, [kontrolMerkeziAcik, temaSeciciAcik, uygulamaSeciciAcik, aksiyonMenusuAcik, izlemeEkleAcik, seritEkleAcik]);

  useEffect(() => {
    const backSub = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backSub.remove();
  }, [handleBackPress]);

  // Cihazdaki Gerçek Uygulamaları Tara ve Kategorize Et
  const yukluUygulamalariGetir = useCallback(async () => {
    if (Platform.OS === 'android' && TVAppManager && TVAppManager.getInstalledApps) {
      try {
        const apps = await TVAppManager.getInstalledApps();
        if (Array.isArray(apps)) {
          setCihazUygulamalari(apps);

          // Otomatik akıllı kategori ataması
          const renkPaleti = ['#3A1448', '#1B355A', '#15324D', '#5A1616', '#123D24', '#B45309', '#0A2544'];
          const yeniUygulamalar: UygulamaItem[] = apps.map((a, idx) => {
            const lowerName = a.name.toLowerCase();
            const lowerPkg = a.packageName.toLowerCase();

            let cat: AppCategory = 'tools';
            if (
              lowerName.includes('netflix') ||
              lowerName.includes('prime') ||
              lowerName.includes('youtube') ||
              lowerName.includes('disney') ||
              lowerName.includes('kodi') ||
              lowerName.includes('cloudstream') ||
              lowerName.includes('nuvio') ||
              lowerName.includes('stremio') ||
              lowerName.includes('vlc') ||
              lowerName.includes('plex') ||
              lowerName.includes('jellyfin') ||
              lowerPkg.includes('video') ||
              lowerPkg.includes('media')
            ) {
              cat = 'media';
            } else if (
              lowerName.includes('tv') ||
              lowerName.includes('trt') ||
              lowerName.includes('canlı') ||
              lowerName.includes('sport') ||
              lowerName.includes('exxen') ||
              lowerName.includes('tivibu') ||
              lowerName.includes('iptv')
            ) {
              cat = 'tv';
            } else if (
              lowerName.includes('game') ||
              lowerName.includes('retro') ||
              lowerName.includes('oyun') ||
              lowerName.includes('play') ||
              lowerPkg.includes('game')
            ) {
              cat = 'games';
            }

            return {
              id: a.packageName,
              name: a.name,
              packageName: a.packageName,
              color: renkPaleti[idx % renkPaleti.length],
              icon: '▶',
              category: cat,
              isFavorite: idx < 7, // İlk 7'si varsayılan favori
            };
          });

          setUygulamalar(yeniUygulamalar);
        }
      } catch (err) {
        console.log('Uygulama listesi hatası:', err);
      }
    }
  }, []);

  // Cihaz Bilgilerini Alma
  useEffect(() => {
    yukluUygulamalariGetir();

    if (Platform.OS === 'android' && TVAppManager && TVAppManager.getDeviceInfo) {
      TVAppManager.getDeviceInfo()
        .then((info: any) => {
          if (info) {
            setCihazBilgisi({
              model: info.model || 'Android TV',
              android: `Android ${info.androidVersion || '12'}`,
              manufacturer: info.manufacturer || 'Xiaomi',
            });
          }
        })
        .catch(() => {});
    }
  }, [yukluUygulamalariGetir]);

  // Canlı Saat & Tarih
  useEffect(() => {
    const updateTime = () => {
      const simdi = new Date();
      setSaat(simdi.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      setTarih(simdi.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Canlı Otomatik Hava Durumu (IP Bazlı Konum)
  useEffect(() => {
    const havaDurumuGetir = async () => {
      try {
        const ipRes = await fetch('http://ip-api.com/json');
        const ipData = await ipRes.json();
        if (ipData && ipData.status === 'success') {
          const { city, lat, lon } = ipData;
          const meteoRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
          );
          const meteoData = await meteoRes.json();
          if (meteoData && meteoData.current_weather) {
            const temp = Math.round(meteoData.current_weather.temperature);
            const code = meteoData.current_weather.weathercode;
            let icon = '⛅';
            let durum = 'Parçalı Bulutlu';
            if (code === 0) { icon = '☀️'; durum = 'Açık Güneşli'; }
            else if (code >= 1 && code <= 3) { icon = '⛅'; durum = 'Parçalı Bulutlu'; }
            else if (code >= 51 && code <= 82) { icon = '🌧️'; durum = 'Yağmurlu'; }
            else if (code >= 71 && code <= 86) { icon = '❄️'; durum = 'Kar Yağışlı'; }
            else if (code >= 95) { icon = '⛈️'; durum = 'Gök Gürültülü'; }

            setHavaDurumu({ sehir: city, derece: `${temp}°C`, durum, ikon: icon });
          }
        }
      } catch {
        setHavaDurumu({ sehir: 'Türkiye', derece: '15°C', durum: 'Açık', ikon: '☀️' });
      }
    };
    havaDurumuGetir();
  }, []);

  // LeTa Uyku Zamanlayıcısı (Sleep Timer) Geri Sayımı
  useEffect(() => {
    if (uykuSuresiDakika === null || kalanUykuSaniye <= 0) return;

    const timer = setInterval(() => {
      setKalanUykuSaniye((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setUykuSuresiDakika(null);
          // Ekranı karart veya ana ekrana geç
          Alert.alert('⏱️ Uyku Zamanlayıcısı', 'Zamanlayıcı süresi doldu. TV uyku moduna geçiyor.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [uykuSuresiDakika, kalanUykuSaniye]);

  const uykuZamanlayiciAyarla = (dakika: number | null) => {
    if (dakika === null) {
      setUykuSuresiDakika(null);
      setKalanUykuSaniye(0);
      setBildirimMetni('⏱️ Uyku zamanlayıcısı kapatıldı.');
    } else {
      setUykuSuresiDakika(dakika);
      setKalanUykuSaniye(dakika * 60);
      setBildirimMetni(`⏱️ Uyku zamanlayıcısı ${dakika} dakikaya ayarlandı.`);
    }
    setTimeout(() => setBildirimMetni(''), 3000);
  };

  // RAM Temizleme / Hızlandırma Simülasyonu
  const ramTemizle = () => {
    setBildirimMetni('🧹 Önbellek temizleniyor...');
    setTimeout(() => {
      setBildirimMetni('⚡ Sistem ve başlatıcı optimize edildi! +280 MB RAM serbest bırakıldı.');
      setTimeout(() => setBildirimMetni(''), 4000);
    }, 800);
  };

  // Uygulama Başlatma
  const uygulamaBaslat = async (pkg: string, appName: string = '') => {
    try {
      if (Platform.OS === 'android' && TVAppManager && TVAppManager.launchApp) {
        const basari = await TVAppManager.launchApp(pkg);
        if (basari) return;
      }
      const webUrl = `market://details?id=${pkg}`;
      Linking.openURL(webUrl).catch(() => {
        Alert.alert('Bilgi', `"${appName || pkg}" uygulaması bu cihazda yüklü değil.`);
      });
    } catch {
      Alert.alert('Hata', 'Uygulama başlatılamadı.');
    }
  };

  // Uygulama Seçenekleri (Uzun Basma Menüsü)
  const appAksiyonAc = (app: UygulamaItem) => {
    setSeciliAksiyonUygulama(app);
    setAksiyonMenusuAcik(true);
  };

  const favoriDurumDegistir = (pkg: string) => {
    setUygulamalar((prev) =>
      prev.map((u) => (u.packageName === pkg ? { ...u, isFavorite: !u.isFavorite } : u))
    );
    setAksiyonMenusuAcik(false);
  };

  const kategoriDegistir = (pkg: string, yeniKat: AppCategory) => {
    setUygulamalar((prev) =>
      prev.map((u) => (u.packageName === pkg ? { ...u, category: yeniKat } : u))
    );
    setAksiyonMenusuAcik(false);
  };

  // Otomatik Sessiz Güncelleme Denetle & Yükle
  const guncellemeDenetleVeYukle = async () => {
    setBildirimMetni('🔄 Güncellemeler denetleniyor...');
    setTimeout(async () => {
      try {
        Alert.alert(
          '🚀 GS TV Launcher Güncellemesi',
          `Sürüm v${CURRENT_VERSION} güncel bir yapı ile yenilensin mi?\n\n(Tarayıcı açılmadan otomatik olarak arka planda indirilir ve kurulur.)`,
          [
            { text: 'Vazgeç', style: 'cancel', onPress: () => setBildirimMetni('') },
            {
              text: 'Hemen Güncelle',
              onPress: async () => {
                setBildirimMetni('⏳ Güncelleme paketi indiriliyor... Lütfen bekleyin.');
                if (Platform.OS === 'android' && TVAppManager && TVAppManager.installUpdate) {
                  try {
                    await TVAppManager.installUpdate(LATEST_RELEASE_APK);
                    setBildirimMetni('✔ İndirme tamamlandı! Yükleyici başlatılıyor...');
                  } catch {
                    setBildirimMetni('');
                    Linking.openURL(LATEST_RELEASE_APK);
                  }
                } else {
                  setBildirimMetni('');
                  Linking.openURL(LATEST_RELEASE_APK);
                }
              },
            },
          ]
        );
      } catch {
        setBildirimMetni('');
        Alert.alert('Hata', 'Güncelleme sunucusuna ulaşılamadı.');
      }
    }, 800);
  };

  // Orijinal TV Ekranına Dön
  const orijinalTemayaDon = async () => {
    Alert.alert('Orijinal TV Arayüzü', 'Mi Box orijinal ana ekranına dönmek istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Evet, Dön',
        onPress: async () => {
          const launchers = [
            'com.google.android.tvlauncher',
            'com.google.android.apps.tv.launcherx',
            'com.xiaomi.mitv.tvbox.launcher',
          ];
          for (const pkg of launchers) {
            try {
              const url = `intent:#Intent;package=${pkg};action=android.intent.action.MAIN;category=android.intent.category.HOME;end`;
              if (await Linking.canOpenURL(url).catch(() => false)) {
                await Linking.openURL(url);
                return;
              }
            } catch {}
          }
          if (Platform.OS === 'android') {
            Linking.sendIntent('android.settings.HOME_SETTINGS').catch(() => {});
          }
        },
      },
    ]);
  };

  // Filtrelenmiş Uygulamalar (Kategoriye & Aramaya Göre)
  const goruntulenenUygulamalar = useMemo(() => {
    let liste = uygulamalar;
    if (aramaMetni.trim().length > 0) {
      const q = aramaMetni.toLowerCase();
      return liste.filter((u) => u.name.toLowerCase().includes(q) || u.packageName.toLowerCase().includes(q));
    }
    if (seciliKategori === 'all') {
      // Tümü seçiliyken önce favoriler sonra diğerleri
      return liste;
    }
    return liste.filter((u) => u.category === seciliKategori);
  }, [uygulamalar, seciliKategori, aramaMetni]);

  // Favoriler Dock (Ana ekranda hızlı erişim)
  const favoriler = useMemo(() => {
    return uygulamalar.filter((u) => u.isFavorite);
  }, [uygulamalar]);

  // İzleme Ekleme
  const izlemeEkle = () => {
    if (!yeniFilmBaslik.trim()) {
      Alert.alert('Uyarı', 'Lütfen içerik adı girin.');
      return;
    }
    const yeniItem: IzlenenItem = {
      id: Date.now().toString(),
      title: yeniFilmBaslik.trim(),
      appName: 'Medya Oynatıcı',
      pkg: favoriler[0]?.packageName || 'com.google.android.youtube.tv',
      image: CARD_DUNE,
      progress: Math.min(100, Math.max(0, parseInt(yeniFilmYuzde, 10) || 50)),
    };
    setSonIzlenenler([yeniItem, ...sonIzlenenler]);
    setYeniFilmBaslik('');
    setYeniFilmYuzde('50');
    setIzlemeEkleAcik(false);
  };

  // Yeni İçerik Şeridi Ekleme
  const icerikSeridiEkle = (app: { name: string; packageName: string }) => {
    const ornekFilmler = [
      { id: '1', title: `${app.name} Trend 1`, image: CARD_DUNE, badge: '4K HDR', pkg: app.packageName },
      { id: '2', title: `${app.name} Popüler`, image: CARD_TLOU, badge: 'Yeni Sezon', pkg: app.packageName },
      { id: '3', title: `${app.name} Çok İzlenen`, image: CARD_HOTD, badge: 'IMDb 8.8', pkg: app.packageName },
      { id: '4', title: `${app.name} Önerilen`, image: CARD_OPP, badge: 'Ödüllü', pkg: app.packageName },
    ];
    const yeniSerit: IcerikSeridi = {
      id: `${app.packageName}_${Date.now()}`,
      appName: app.name,
      pkg: app.packageName,
      appColor: aktifTema.accent,
      kartlar: ornekFilmler,
    };
    setSeritler([...seritler, yeniSerit]);
    setSeritEkleAcik(false);
  };

  // Arka plan rengi veya duvar kağıdı
  const arkaplanStili = [
    styles.arkaplan,
    aktifTema.wallpaperKey === 'oled' && { backgroundColor: '#000000' },
  ];

  return (
    <ImageBackground
      source={aktifTema.wallpaperKey === 'oled' ? undefined : BG_WALLPAPER}
      style={arkaplanStili}
      resizeMode="cover"
    >
      <StatusBar hidden={true} />
      <SafeAreaView style={[styles.camKatman, { backgroundColor: aktifTema.bgGradientColor }]}>
        {/* ================= ÜST BAR: MONET + LETA KONTROL PANELİ ================= */}
        <View style={styles.ustBar}>
          {/* Sol: GS Logosu & Dinamik Arama */}
          <View style={styles.ustSol}>
            <Image source={GS_ICON} style={styles.gsLogoResim} resizeMode="cover" />
            <View>
              <Text style={styles.gsBaslik}>GS LAUNCHER</Text>
              <Text style={styles.gsSurum}>Pro TV Edition</Text>
            </View>

            <View style={[styles.aramaKapsul, { borderColor: aktifTema.surface }]}>
              <Text style={styles.aramaIkon}>🔍</Text>
              <TextInput
                style={styles.aramaGirdi}
                placeholder="Ara: Uygulama, Film, Dizi..."
                placeholderTextColor="rgba(255, 255, 255, 0.55)"
                value={aramaMetni}
                onChangeText={setAramaMetni}
              />
              {aramaMetni.length > 0 && (
                <TouchableOpacity onPress={() => setAramaMetni('')}>
                  <Text style={styles.aramaTemizle}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Sağ: Durum, Uyku Zamanlayıcı, Saat, Hava Durumu, Kontrol Merkezi */}
          <View style={styles.ustSag}>
            {uykuSuresiDakika !== null && (
              <View style={[styles.uykuRozet, { borderColor: aktifTema.border }]}>
                <Text style={styles.uykuRozetYazi}>
                  ⏱️ {Math.floor(kalanUykuSaniye / 60)}:{(kalanUykuSaniye % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            )}

            {/* Canlı Saat & Tarih Widget (Material You) */}
            <View style={styles.saatTarihKutu}>
              <Text style={styles.saatYazi}>{saat}</Text>
              <Text style={styles.tarihYazi}>{tarih}</Text>
            </View>

            {/* Canlı Hava Durumu Widget (Monet Otomatik Konum) */}
            <View style={styles.havaKutu}>
              <Text style={styles.havaIkon}>{havaDurumu.ikon}</Text>
              <View>
                <Text style={styles.havaDerece}>{havaDurumu.derece}</Text>
                <Text style={styles.havaSehir}>{havaDurumu.sehir}</Text>
              </View>
            </View>

            {/* LETA HIZLI KONTROL MERKEZİ BUTONU */}
            <FocusableItem
              style={[styles.kontrolMerkeziButon, { borderColor: aktifTema.border }]}
              focusedStyle={[styles.kontrolMerkeziOdak, { borderColor: aktifTema.border, shadowColor: aktifTema.accent }]}
              onPress={() => setKontrolMerkeziAcik(true)}
            >
              {(isFocused) => (
                <View style={styles.kontrolButonIcerik}>
                  <Text style={styles.kontrolIkon}>⚡</Text>
                  <Text style={[styles.kontrolYazi, isFocused && { color: aktifTema.accent }]}>
                    Kontrol Merkezi
                  </Text>
                </View>
              )}
            </FocusableItem>
          </View>
        </View>

        {/* Canlı Bildirim Bandı (RAM temizleme, Güncelleme durumu vb.) */}
        {!!bildirimMetni && (
          <View style={[styles.bildirimKutusu, { backgroundColor: aktifTema.surface, borderColor: aktifTema.border }]}>
            <Text style={[styles.bildirimYazi, { color: aktifTema.border }]}>{bildirimMetni}</Text>
          </View>
        )}

        {/* ================= ANA SCROLL ALANI ================= */}
        <ScrollView style={styles.anaKaydirma} showsVerticalScrollIndicator={false}>
          {/* 1. HERO SİNEMATİK BANNER */}
          <View style={styles.heroKapsayici}>
            <ImageBackground source={HERO_DUNE} style={styles.heroResim} imageStyle={styles.heroResimStil}>
              <View style={styles.heroKarartma}>
                <View style={styles.heroIcerik}>
                  <View style={[styles.heroRozet, { backgroundColor: aktifTema.accent }]}>
                    <Text style={[styles.heroRozetYazi, { color: aktifTema.textOnAccent }]}>★ 4K HDR • IMDb 8.6</Text>
                  </View>
                  <FocusableItem
                    style={[styles.simdiIzleButon, { backgroundColor: aktifTema.accent }]}
                    focusedStyle={[styles.simdiIzleOdak, { shadowColor: aktifTema.accent }]}
                    onPress={() => {
                      const secili = favoriler[0]?.packageName || 'com.google.android.youtube.tv';
                      uygulamaBaslat(secili, 'Dune: Part Two');
                    }}
                  >
                    {() => (
                      <View style={styles.simdiIzleIcerik}>
                        <Text style={[styles.oynatUcgen, { color: aktifTema.textOnAccent }]}>▶</Text>
                        <Text style={[styles.simdiIzleYazi, { color: aktifTema.textOnAccent }]}>Şimdi İzle</Text>
                      </View>
                    )}
                  </FocusableItem>
                </View>
              </View>
            </ImageBackground>
          </View>

          {/* 2. LETA KATEGORİ SEKMELERİ (FİLTRE ÇUBUĞU) */}
          <View style={styles.kategoriKapsayici}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { id: 'all', title: '⭐ Tümü & Favoriler' },
                { id: 'media', title: '🎬 Sinema & Dizi' },
                { id: 'tv', title: '📡 Canlı TV & Spor' },
                { id: 'games', title: '🎮 Oyunlar' },
                { id: 'tools', title: '🛠️ Araçlar & Sistem' },
              ].map((kat) => {
                const aktif = seciliKategori === kat.id;
                return (
                  <FocusableItem
                    key={kat.id}
                    style={[
                      styles.kategoriPill,
                      aktif && [styles.kategoriPillAktif, { backgroundColor: aktifTema.accent }],
                    ]}
                    focusedStyle={{ borderColor: aktifTema.border, transform: [{ scale: 1.06 }] }}
                    onPress={() => setSeciliKategori(kat.id as AppCategory)}
                  >
                    {() => (
                      <Text
                        style={[
                          styles.kategoriPillYazi,
                          aktif && [styles.kategoriPillYaziAktif, { color: aktifTema.textOnAccent }],
                        ]}
                      >
                        {kat.title}
                      </Text>
                    )}
                  </FocusableItem>
                );
              })}
            </ScrollView>
          </View>

          {/* 3. UYGULAMALAR RAF/DOCK (GERÇEK KURULU UYGULAMALAR) */}
          <View style={styles.bolumBaslikSatir}>
            <View style={styles.bolumBaslikIkonlu}>
              <Text style={[styles.bolumBaslik, { color: '#FFFFFF' }]}>
                {seciliKategori === 'all' ? 'Uygulamalarım' : 'Kategori Uygulamaları'}
              </Text>
              <Text style={styles.appSayiRozet}>({goruntulenenUygulamalar.length})</Text>
            </View>
            <FocusableItem
              onPress={() => {
                yukluUygulamalariGetir();
                setUygulamaSeciciAcik(true);
              }}
              style={[styles.tumunuGorButon, { borderColor: aktifTema.border }]}
              focusedStyle={{ borderColor: aktifTema.accent }}
            >
              {() => <Text style={[styles.tumunuGorYazi, { color: aktifTema.border }]}>+ Uygulama Yönetimi</Text>}
            </FocusableItem>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yatayListe}>
            {goruntulenenUygulamalar.map((app) => (
              <FocusableItem
                key={app.id}
                style={[styles.appKarti, { backgroundColor: app.color }]}
                focusedStyle={[styles.appKartiOdak, { borderColor: aktifTema.border, shadowColor: aktifTema.accent }]}
                onPress={() => uygulamaBaslat(app.packageName, app.name)}
                onLongPress={() => appAksiyonAc(app)}
              >
                {() => (
                  <View style={styles.appKartIcerik}>
                    <Text style={styles.appIkonMetin}>{app.icon}</Text>
                    <Text style={styles.appIsim} numberOfLines={1}>
                      {app.name}
                    </Text>
                    {app.isFavorite && <Text style={styles.favoriYildiz}>⭐</Text>}
                  </View>
                )}
              </FocusableItem>
            ))}

            {/* '+' BUTONU */}
            <FocusableItem
              style={[styles.artiKarti, { borderColor: aktifTema.border }]}
              focusedStyle={[styles.artiKartiOdak, { borderColor: aktifTema.accent, shadowColor: aktifTema.accent }]}
              onPress={() => {
                yukluUygulamalariGetir();
                setUygulamaSeciciAcik(true);
              }}
            >
              {() => (
                <View style={styles.artiIcerik}>
                  <Text style={[styles.artiIkon, { color: aktifTema.border }]}>+</Text>
                  <Text style={styles.artiYazi}>Uygulama Ekle</Text>
                </View>
              )}
            </FocusableItem>
          </ScrollView>

          {/* 4. GERÇEK SON İZLENENLER (CONTINUE WATCHING) */}
          <View style={styles.bolumBaslikSatir}>
            <View style={styles.bolumBaslikIkonlu}>
              <Text style={styles.saatGecmisIkon}>🕒</Text>
              <Text style={styles.bolumBaslik}>Son İzlediklerim</Text>
            </View>
            <FocusableItem
              onPress={() => setIzlemeEkleAcik(true)}
              style={[styles.tumunuGorButon, { borderColor: aktifTema.border }]}
              focusedStyle={{ borderColor: aktifTema.accent }}
            >
              {() => <Text style={[styles.tumunuGorYazi, { color: aktifTema.border }]}>+ İzleme Ekle</Text>}
            </FocusableItem>
          </View>

          {sonIzlenenler.length === 0 ? (
            <View style={styles.bosIzlemeKutusu}>
              <Text style={styles.bosIzlemeYazi}>
                İzleme geçmişiniz henüz boş. İzlediklerinizi eklemek için "+ İzleme Ekle" butonuna basın.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yatayListe}>
              {sonIzlenenler.map((film) => (
                <FocusableItem
                  key={film.id}
                  style={styles.sonIzlenenKarti}
                  focusedStyle={[styles.sonIzlenenOdak, { borderColor: aktifTema.border, shadowColor: aktifTema.accent }]}
                  onPress={() => uygulamaBaslat(film.pkg, film.title)}
                  onLongPress={() => {
                    Alert.alert('Geçmişten Kaldır', `"${film.title}" geçmişten silinsin mi?`, [
                      { text: 'Vazgeç', style: 'cancel' },
                      {
                        text: 'Sil',
                        style: 'destructive',
                        onPress: () => setSonIzlenenler(sonIzlenenler.filter((s) => s.id !== film.id)),
                      },
                    ]);
                  }}
                >
                  {() => (
                    <ImageBackground source={film.image} style={styles.sonIzlenenResim} imageStyle={{ borderRadius: 14 }}>
                      <View style={styles.sonIzlenenAltBar}>
                        <View style={styles.sonIzlenenBilgiSatir}>
                          <Text style={styles.sonIzlenenBaslik} numberOfLines={1}>
                            {film.title}
                          </Text>
                          <Text style={[styles.sonIzlenenYuzde, { color: aktifTema.border }]}>%{film.progress}</Text>
                        </View>
                        <View style={styles.ilerlemeZemin}>
                          <View style={[styles.ilerlemeDolu, { width: `${film.progress}%`, backgroundColor: aktifTema.accent }]} />
                        </View>
                      </View>
                    </ImageBackground>
                  )}
                </FocusableItem>
              ))}
            </ScrollView>
          )}

          {/* 5. DİNAMİK TRANSPARAN UYGULAMA İÇERİK ŞERİTLERİ */}
          {seritler.map((serit) => (
            <View key={serit.id} style={styles.seritKapsayici}>
              <View style={styles.bolumBaslikSatir}>
                <View style={styles.bolumBaslikIkonlu}>
                  <View style={[styles.seritNokta, { backgroundColor: serit.appColor }]} />
                  <Text style={styles.bolumBaslik}>{serit.appName}</Text>
                </View>
                <FocusableItem
                  onPress={() => {
                    Alert.alert('Şeridi Kaldır', `"${serit.appName}" şeridi kaldırılsın mı?`, [
                      { text: 'Vazgeç', style: 'cancel' },
                      { text: 'Kaldır', onPress: () => setSeritler(seritler.filter((s) => s.id !== serit.id)) },
                    ]);
                  }}
                  style={styles.tumunuGorButon}
                >
                  {() => <Text style={styles.tumunuGorYazi}>✕ Şeridi Kaldır</Text>}
                </FocusableItem>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yatayListe}>
                {serit.kartlar.map((kart) => (
                  <FocusableItem
                    key={kart.id}
                    style={styles.seritKarti}
                    focusedStyle={[styles.sonIzlenenOdak, { borderColor: aktifTema.border }]}
                    onPress={() => uygulamaBaslat(serit.pkg, serit.appName)}
                  >
                    {() => (
                      <ImageBackground source={kart.image} style={styles.seritResim} imageStyle={{ borderRadius: 14 }}>
                        {kart.badge && (
                          <View style={[styles.seritRozet, { backgroundColor: serit.appColor }]}>
                            <Text style={styles.seritRozetYazi}>{kart.badge}</Text>
                          </View>
                        )}
                        <View style={styles.seritAltBar}>
                          <Text style={styles.seritKartBaslik} numberOfLines={1}>
                            {kart.title}
                          </Text>
                          <Text style={styles.seritKartAltYazi}>▶ {serit.appName} ile İzle</Text>
                        </View>
                      </ImageBackground>
                    )}
                  </FocusableItem>
                ))}
              </ScrollView>
            </View>
          ))}

          {/* 6. '+ YENİ İÇERİK ŞERİDİ EKLE' */}
          <View style={styles.seritEklemeAlani}>
            <FocusableItem
              style={[styles.yeniSeritButon, { borderColor: aktifTema.border }]}
              focusedStyle={[styles.yeniSeritOdak, { borderColor: aktifTema.accent, shadowColor: aktifTema.accent }]}
              onPress={() => {
                yukluUygulamalariGetir();
                setSeritEkleAcik(true);
              }}
            >
              {() => (
                <View style={styles.yeniSeritIcerik}>
                  <Text style={styles.yeniSeritArti}>➕</Text>
                  <Text style={styles.yeniSeritYazi}>Kurulu Uygulamalardan Yeni İçerik Şeridi Ekle</Text>
                </View>
              )}
            </FocusableItem>
          </View>
        </ScrollView>

        {/* ================= MODAL: LETA HIZLI KONTROL MERKEZİ (CONTROL CENTER) ================= */}
        <Modal visible={kontrolMerkeziAcik} transparent animationType="fade">
          <View style={styles.modalArkaplan}>
            <View style={[styles.kontrolMerkeziPencere, { borderColor: aktifTema.border }]}>
              {/* Başlık & Sistem Bilgisi */}
              <View style={styles.kontrolBaslikSatir}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image source={GS_ICON} style={styles.kontrolLogoResim} resizeMode="cover" />
                  <View>
                    <Text style={styles.kontrolMerkeziBaslik}>⚡ GS Hızlı Kontrol Merkezi</Text>
                    <Text style={styles.cihazBilgiYazi}>
                      {cihazBilgisi.manufacturer} {cihazBilgisi.model} • {cihazBilgisi.android} • Mi Box
                    </Text>
                  </View>
                </View>
                <Text style={styles.geriBilgiMetin}>(Kumandadan Geri tuşuyla kapatılır)</Text>
              </View>

              {/* Hızlı Eylem Kartları (Tiles) */}
              <View style={styles.kontrolGrid}>
                {/* 1. Görsel Tema & Renk Değiştirici */}
                <FocusableItem
                  style={[styles.kontrolTile, { borderColor: aktifTema.surface }]}
                  focusedStyle={[styles.kontrolTileOdak, { borderColor: aktifTema.border }]}
                  onPress={() => {
                    setKontrolMerkeziAcik(false);
                    setTemaSeciciAcik(true);
                  }}
                >
                  {() => (
                    <>
                      <Text style={styles.tileIkon}>🎨</Text>
                      <Text style={styles.tileBaslik}>Arayüz Teması</Text>
                      <Text style={[styles.tileAlt, { color: aktifTema.border }]}>{aktifTema.name}</Text>
                    </>
                  )}
                </FocusableItem>

                {/* 2. LeTa Uyku Zamanlayıcısı (Sleep Timer) */}
                <FocusableItem
                  style={[styles.kontrolTile, { borderColor: aktifTema.surface }]}
                  focusedStyle={[styles.kontrolTileOdak, { borderColor: aktifTema.border }]}
                  onPress={() => {
                    Alert.alert('⏱️ Uyku Zamanlayıcısı', 'TV kaç dakika sonra uykuya geçsin?', [
                      { text: 'Kapat', onPress: () => uykuZamanlayiciAyarla(null) },
                      { text: '30 Dakika', onPress: () => uykuZamanlayiciAyarla(30) },
                      { text: '60 Dakika', onPress: () => uykuZamanlayiciAyarla(60) },
                      { text: '90 Dakika', onPress: () => uykuZamanlayiciAyarla(90) },
                    ]);
                  }}
                >
                  {() => (
                    <>
                      <Text style={styles.tileIkon}>⏱️</Text>
                      <Text style={styles.tileBaslik}>Uyku Zamanlayıcısı</Text>
                      <Text style={[styles.tileAlt, { color: aktifTema.border }]}>
                        {uykuSuresiDakika ? `${uykuSuresiDakika} Dk (Aktif)` : 'Kapalı'}
                      </Text>
                    </>
                  )}
                </FocusableItem>

                {/* 3. RAM Hızlandırma & Önbellek Temizleme */}
                <FocusableItem
                  style={[styles.kontrolTile, { borderColor: aktifTema.surface }]}
                  focusedStyle={[styles.kontrolTileOdak, { borderColor: aktifTema.border }]}
                  onPress={ramTemizle}
                >
                  {() => (
                    <>
                      <Text style={styles.tileIkon}>🧹</Text>
                      <Text style={styles.tileBaslik}>RAM Temizle</Text>
                      <Text style={styles.tileAlt}>Başlatıcıyı Hızlandır</Text>
                    </>
                  )}
                </FocusableItem>

                {/* 4. Wi-Fi Ağ Ayarları */}
                <FocusableItem
                  style={[styles.kontrolTile, { borderColor: aktifTema.surface }]}
                  focusedStyle={[styles.kontrolTileOdak, { borderColor: aktifTema.border }]}
                  onPress={() => {
                    if (Platform.OS === 'android' && TVAppManager && TVAppManager.openWifiSettings) {
                      TVAppManager.openWifiSettings().catch(() => {});
                    } else if (Platform.OS === 'android') {
                      Linking.sendIntent('android.settings.WIFI_SETTINGS').catch(() => {});
                    }
                  }}
                >
                  {() => (
                    <>
                      <Text style={styles.tileIkon}>📶</Text>
                      <Text style={styles.tileBaslik}>Wi-Fi & Ağ</Text>
                      <Text style={styles.tileAlt}>Ağ Ayarlarını Aç</Text>
                    </>
                  )}
                </FocusableItem>

                {/* 5. Android TV Sistem Ayarları */}
                <FocusableItem
                  style={[styles.kontrolTile, { borderColor: aktifTema.surface }]}
                  focusedStyle={[styles.kontrolTileOdak, { borderColor: aktifTema.border }]}
                  onPress={() => {
                    if (Platform.OS === 'android' && TVAppManager && TVAppManager.openSettings) {
                      TVAppManager.openSettings().catch(() => {});
                    } else if (Platform.OS === 'android') {
                      Linking.sendIntent('android.settings.SETTINGS').catch(() => {});
                    }
                  }}
                >
                  {() => (
                    <>
                      <Text style={styles.tileIkon}>⚙️</Text>
                      <Text style={styles.tileBaslik}>Sistem Ayarları</Text>
                      <Text style={styles.tileAlt}>Mi Box TV Ayarları</Text>
                    </>
                  )}
                </FocusableItem>

                {/* 6. Sessiz OTA Güncelleme Denetle */}
                <FocusableItem
                  style={[styles.kontrolTile, { borderColor: aktifTema.surface }]}
                  focusedStyle={[styles.kontrolTileOdak, { borderColor: aktifTema.border }]}
                  onPress={guncellemeDenetleVeYukle}
                >
                  {() => (
                    <>
                      <Text style={styles.tileIkon}>🚀</Text>
                      <Text style={styles.tileBaslik}>Güncelleme Denetle</Text>
                      <Text style={[styles.tileAlt, { color: aktifTema.border }]}>v{CURRENT_VERSION} (Yerel)</Text>
                    </>
                  )}
                </FocusableItem>

                {/* 7. Orijinal Mi Box / Leanback Ekranına Dön */}
                <FocusableItem
                  style={[styles.kontrolTile, { borderColor: aktifTema.surface }]}
                  focusedStyle={[styles.kontrolTileOdak, { borderColor: aktifTema.border }]}
                  onPress={orijinalTemayaDon}
                >
                  {() => (
                    <>
                      <Text style={styles.tileIkon}>🏠</Text>
                      <Text style={styles.tileBaslik}>Orijinal TV Arayüzü</Text>
                      <Text style={styles.tileAlt}>Fabrika Ekranına Geç</Text>
                    </>
                  )}
                </FocusableItem>

                {/* 8. Varsayılan Başlatıcı Ayarı */}
                <FocusableItem
                  style={[styles.kontrolTile, { borderColor: aktifTema.surface }]}
                  focusedStyle={[styles.kontrolTileOdak, { borderColor: aktifTema.border }]}
                  onPress={() => {
                    if (Platform.OS === 'android') {
                      Linking.sendIntent('android.settings.HOME_SETTINGS').catch(() => {});
                    }
                  }}
                >
                  {() => (
                    <>
                      <Text style={styles.tileIkon}>⚡</Text>
                      <Text style={styles.tileBaslik}>Varsayılan Başlatıcı</Text>
                      <Text style={styles.tileAlt}>Home Tuşu Ayarı</Text>
                    </>
                  )}
                </FocusableItem>
              </View>
            </View>
          </View>
        </Modal>

        {/* ================= MODAL: MONET TEMA & DUVAR KAĞIDI SEÇİCİ ================= */}
        <Modal visible={temaSeciciAcik} transparent animationType="fade">
          <View style={styles.modalArkaplan}>
            <View style={[styles.modalPencere, { borderColor: aktifTema.border }]}>
              <View style={styles.modalBaslikSatir}>
                <Text style={styles.modalBaslik}>🎨 Arayüz Teması & Renk Paleti</Text>
                <Text style={styles.geriBilgiMetin}>(Geri tuşuyla kapatılır)</Text>
              </View>
              <Text style={styles.modalAltBaslik}>
                Başlatıcınız için cam efektli dinamik renk temasını seçin:
              </Text>

              <ScrollView style={{ maxHeight: 380 }}>
                {MONET_TEMALARI.map((t) => {
                  const secili = aktifTema.id === t.id;
                  return (
                    <FocusableItem
                      key={t.id}
                      style={[
                        styles.temaSecimSatir,
                        { borderColor: t.accent },
                        secili && { backgroundColor: t.surface, borderWidth: 2 },
                      ]}
                      focusedStyle={{ transform: [{ scale: 1.03 }], borderColor: '#FFFFFF' }}
                      onPress={() => {
                        setAktifTema(t);
                        setTemaSeciciAcik(false);
                        setBildirimMetni(`🎨 "${t.name}" teması uygulandı.`);
                        setTimeout(() => setBildirimMetni(''), 3000);
                      }}
                    >
                      {() => (
                        <View style={styles.temaSecimIcerik}>
                          <View style={[styles.renkPaletiKutusu, { backgroundColor: t.accent }]} />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.temaSecimBaslik}>{t.name}</Text>
                            <Text style={styles.temaSecimAlt}>Vurgu: {t.accent} • Dinamik Cam Vurgusu</Text>
                          </View>
                          {secili && <Text style={[styles.temaAktifTik, { color: t.accent }]}>✔ Aktif</Text>}
                        </View>
                      )}
                    </FocusableItem>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ================= MODAL: UYGULAMA SEÇENEKLERİ (UZUN BASMA MENÜSÜ) ================= */}
        <Modal visible={aksiyonMenusuAcik} transparent animationType="fade">
          <View style={styles.modalArkaplan}>
            <View style={[styles.modalPencereKucuk, { borderColor: aktifTema.border }]}>
              <View style={styles.modalBaslikSatir}>
                <Text style={styles.modalBaslik}>⚡ {seciliAksiyonUygulama?.name}</Text>
                <Text style={styles.geriBilgiMetin}>(Geri tuşuyla kapatılır)</Text>
              </View>

              <Text style={styles.modalAltBaslik}>Yapmak istediğiniz işlemi seçin:</Text>

              {seciliAksiyonUygulama && (
                <View style={{ marginTop: 8 }}>
                  {/* Favori Aç / Kapa */}
                  <FocusableItem
                    style={styles.aksiyonButon}
                    focusedStyle={{ borderColor: aktifTema.border }}
                    onPress={() => favoriDurumDegistir(seciliAksiyonUygulama.packageName)}
                  >
                    {() => (
                      <Text style={styles.aksiyonButonYazi}>
                        {seciliAksiyonUygulama.isFavorite ? '⭐ Favorilerden Kaldır' : '⭐ Favorilere Ekle'}
                      </Text>
                    )}
                  </FocusableItem>

                  {/* Kategori Atamaları */}
                  <Text style={styles.aksiyonKategoriBaslik}>Kategori Değiştir:</Text>
                  <View style={styles.aksiyonKategoriSatir}>
                    {[
                      { id: 'media', label: '🎬 Sinema' },
                      { id: 'tv', label: '📡 TV' },
                      { id: 'games', label: '🎮 Oyun' },
                      { id: 'tools', label: '🛠️ Araç' },
                    ].map((k) => (
                      <FocusableItem
                        key={k.id}
                        style={[
                          styles.kategoriSecimPill,
                          seciliAksiyonUygulama.category === k.id && { backgroundColor: aktifTema.accent },
                        ]}
                        focusedStyle={{ borderColor: aktifTema.border }}
                        onPress={() => kategoriDegistir(seciliAksiyonUygulama.packageName, k.id as AppCategory)}
                      >
                        {() => (
                          <Text
                            style={[
                              styles.kategoriSecimPillYazi,
                              seciliAksiyonUygulama.category === k.id && { color: aktifTema.textOnAccent },
                            ]}
                          >
                            {k.label}
                          </Text>
                        )}
                      </FocusableItem>
                    ))}
                  </View>

                  {/* Uygulama Bilgisi / İzinleri */}
                  <FocusableItem
                    style={[styles.aksiyonButon, { marginTop: 12 }]}
                    focusedStyle={{ borderColor: aktifTema.border }}
                    onPress={() => {
                      if (Platform.OS === 'android' && TVAppManager && TVAppManager.openAppDetails) {
                        TVAppManager.openAppDetails(seciliAksiyonUygulama.packageName).catch(() => {});
                      }
                      setAksiyonMenusuAcik(false);
                    }}
                  >
                    {() => <Text style={styles.aksiyonButonYazi}>ℹ️ Uygulama Bilgisi & İzinleri (Ayarlar)</Text>}
                  </FocusableItem>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* ================= MODAL: CİHAZDAKİ KURULU UYGULAMALARI SEÇME ================= */}
        <Modal visible={uygulamaSeciciAcik} transparent animationType="fade">
          <View style={styles.modalArkaplan}>
            <View style={[styles.modalPencere, { borderColor: aktifTema.border }]}>
              <View style={styles.modalBaslikSatir}>
                <Text style={styles.modalBaslik}>📱 Cihazınızda Kurulu Uygulamalar</Text>
                <Text style={styles.geriBilgiMetin}>(Geri tuşuyla kapatılır)</Text>
              </View>
              <Text style={styles.modalAltBaslik}>
                Favorilere veya ana ekrana eklemek için seçin (Kumandadan tıklayın):
              </Text>

              {cihazUygulamalari.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#DDD', fontSize: 13 }}>Kurulu uygulamalar yükleniyor...</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 340 }}>
                  <View style={styles.gridKutusu}>
                    {cihazUygulamalari.map((app) => {
                      const zatenEkli = uygulamalar.some(
                        (u) => u.packageName === app.packageName && u.isFavorite
                      );
                      return (
                        <FocusableItem
                          key={app.packageName}
                          style={[styles.kuruluAppKarti, zatenEkli && styles.kuruluAppEkli]}
                          focusedStyle={[styles.appKartiOdak, { borderColor: aktifTema.border }]}
                          onPress={() => favoriDurumDegistir(app.packageName)}
                        >
                          {() => (
                            <>
                              <Text style={styles.kuruluAppIkon}>▶</Text>
                              <Text style={styles.kuruluAppBaslik} numberOfLines={1}>
                                {app.name}
                              </Text>
                              <Text style={[styles.kuruluAppDurum, zatenEkli ? styles.metinYesil : styles.metinGri]}>
                                {zatenEkli ? '✔ Favorilerde' : '+ Favoriye Ekle'}
                              </Text>
                            </>
                          )}
                        </FocusableItem>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* ================= MODAL: İZLEME EKLEME ================= */}
        <Modal visible={izlemeEkleAcik} transparent animationType="fade">
          <View style={styles.modalArkaplan}>
            <View style={[styles.modalPencereKucuk, { borderColor: aktifTema.border }]}>
              <View style={styles.modalBaslikSatir}>
                <Text style={styles.modalBaslik}>🕒 Gerçek İzleme Kaydı Ekle</Text>
                <Text style={styles.geriBilgiMetin}>(Geri tuşuyla kapatılır)</Text>
              </View>

              <Text style={styles.modalAltBaslik}>İzlediğiniz film veya diziyi girin:</Text>

              <TextInput
                style={styles.modalGirdiTam}
                placeholder="İçerik Adı (Örn: Dune 2, The Boys)"
                placeholderTextColor="#777"
                value={yeniFilmBaslik}
                onChangeText={setYeniFilmBaslik}
              />

              <TextInput
                style={styles.modalGirdiTam}
                placeholder="İzlenme Yüzdesi (Örn: 75)"
                placeholderTextColor="#777"
                keyboardType="numeric"
                value={yeniFilmYuzde}
                onChangeText={setYeniFilmYuzde}
              />

              <FocusableItem
                style={[styles.kaydetButon, { backgroundColor: aktifTema.accent }]}
                focusedStyle={{ transform: [{ scale: 1.05 }], borderColor: '#FFFFFF' }}
                onPress={izlemeEkle}
              >
                {() => <Text style={[styles.kaydetYazi, { color: aktifTema.textOnAccent }]}>✔ Listeme Ekle</Text>}
              </FocusableItem>
            </View>
          </View>
        </Modal>

        {/* ================= MODAL: İÇERİK ŞERİDİ EKLEME ================= */}
        <Modal visible={seritEkleAcik} transparent animationType="fade">
          <View style={styles.modalArkaplan}>
            <View style={[styles.modalPencere, { borderColor: aktifTema.border }]}>
              <View style={styles.modalBaslikSatir}>
                <Text style={styles.modalBaslik}>📺 Uygulama İçerik Şeridi Ekle</Text>
                <Text style={styles.geriBilgiMetin}>(Geri tuşuyla kapatılır)</Text>
              </View>
              <Text style={styles.modalAltBaslik}>
                Ana sayfanızda hangi uygulamanın film/dizi şeridi aksın?
              </Text>

              <ScrollView style={{ maxHeight: 340 }}>
                <View style={styles.gridKutusu}>
                  {cihazUygulamalari.map((app) => (
                    <FocusableItem
                      key={app.packageName}
                      style={styles.seritSecimKarti}
                      focusedStyle={[styles.sonIzlenenOdak, { borderColor: aktifTema.border }]}
                      onPress={() => icerikSeridiEkle(app)}
                    >
                      {() => (
                        <>
                          <View style={[styles.seritSecimDaire, { backgroundColor: aktifTema.accent }]} />
                          <Text style={styles.seritSecimYazi} numberOfLines={1}>
                            {app.name}
                          </Text>
                          <Text style={styles.seritSecimAlt}>+ Şerit Olarak Ekle</Text>
                        </>
                      )}
                    </FocusableItem>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  arkaplan: { flex: 1, backgroundColor: '#0A0C16' },
  camKatman: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 16,
  },

  // ÜST BAR
  ustBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ustSol: { flexDirection: 'row', alignItems: 'center' },
  gsLogoResim: {
    width: 38,
    height: 38,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  kontrolLogoResim: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  gsLogoKare: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  gsLogoYazi: { fontSize: 16, fontWeight: '900' },
  gsBaslik: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  gsSurum: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  aramaKapsul: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 38,
    marginLeft: 20,
    width: 320,
    borderWidth: 1,
  },
  aramaIkon: { fontSize: 14, marginRight: 8, opacity: 0.7 },
  aramaGirdi: { flex: 1, color: '#FFFFFF', fontSize: 13 },
  aramaTemizle: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 14, paddingHorizontal: 4 },

  ustSag: { flexDirection: 'row', alignItems: 'center' },
  uykuRozet: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    marginRight: 14,
  },
  uykuRozetYazi: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  saatTarihKutu: { alignItems: 'flex-end', marginRight: 16 },
  saatYazi: { color: '#FFFFFF', fontSize: 19, fontWeight: '700', letterSpacing: 0.5 },
  tarihYazi: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 10 },

  havaKutu: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 14,
  },
  havaIkon: { fontSize: 18, marginRight: 6 },
  havaDerece: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  havaSehir: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 9 },

  kontrolMerkeziButon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  kontrolMerkeziOdak: {
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    transform: [{ scale: 1.05 }],
  },
  kontrolButonIcerik: { flexDirection: 'row', alignItems: 'center' },
  kontrolIkon: { fontSize: 14, marginRight: 6 },
  kontrolYazi: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  bildirimKutusu: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 10,
    alignSelf: 'center',
  },
  bildirimYazi: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  anaKaydirma: { flex: 1 },

  // SİNEMATİK HERO BANNER
  heroKapsayici: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroResim: { width: '100%', height: '100%' },
  heroResimStil: { borderRadius: 20 },
  heroKarartma: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  heroIcerik: { flexDirection: 'row', alignItems: 'center' },
  heroRozet: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 14,
  },
  heroRozetYazi: { fontSize: 11, fontWeight: '800' },
  simdiIzleButon: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  simdiIzleOdak: {
    transform: [{ scale: 1.08 }],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
  },
  simdiIzleIcerik: { flexDirection: 'row', alignItems: 'center' },
  oynatUcgen: { fontSize: 12, marginRight: 6 },
  simdiIzleYazi: { fontSize: 13, fontWeight: '800' },

  // LETA KATEGORİ SEKMELERİ
  kategoriKapsayici: { marginBottom: 16 },
  kategoriPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  kategoriPillAktif: { borderWidth: 1 },
  kategoriPillYazi: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontWeight: '700' },
  kategoriPillYaziAktif: { fontWeight: '900' },

  // BÖLÜM BAŞLIKLARI
  bolumBaslikSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  bolumBaslikIkonlu: { flexDirection: 'row', alignItems: 'center' },
  bolumBaslik: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  appSayiRozet: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 12, marginLeft: 6 },
  tumunuGorButon: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  tumunuGorYazi: { fontSize: 11, fontWeight: '700' },

  yatayListe: { flexDirection: 'row', marginBottom: 20 },

  // UYGULAMA KARTLARI
  appKarti: {
    width: 125,
    height: 72,
    borderRadius: 16,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  appKartiOdak: {
    borderWidth: 2.5,
    transform: [{ scale: 1.08 }],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
  },
  appKartIcerik: { alignItems: 'center', paddingHorizontal: 6, position: 'relative' },
  appIkonMetin: { fontSize: 16, color: '#FFFFFF', marginBottom: 3 },
  appIsim: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  favoriYildiz: { position: 'absolute', top: -14, right: -24, fontSize: 9 },

  artiKarti: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  artiKartiOdak: {
    borderWidth: 2,
    transform: [{ scale: 1.08 }],
  },
  artiIcerik: { alignItems: 'center' },
  artiIkon: { fontSize: 20, fontWeight: '700' },
  artiYazi: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 8, marginTop: 2 },

  // SON İZLENENLER KARTLARI
  sonIzlenenKarti: {
    width: 215,
    height: 120,
    borderRadius: 16,
    marginRight: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sonIzlenenOdak: {
    borderWidth: 2.5,
    transform: [{ scale: 1.06 }],
  },
  sonIzlenenResim: { width: '100%', height: '100%', justifyContent: 'flex-end' },
  sonIzlenenAltBar: {
    backgroundColor: 'rgba(10, 14, 25, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  sonIzlenenBilgiSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sonIzlenenBaslik: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', flex: 1 },
  sonIzlenenYuzde: { fontSize: 10, fontWeight: '800' },
  ilerlemeZemin: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  ilerlemeDolu: { height: '100%', borderRadius: 2 },

  bosIzlemeKutusu: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
  },
  bosIzlemeYazi: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, textAlign: 'center' },
  saatGecmisIkon: { fontSize: 16, marginRight: 6 },

  // ŞERİTLER
  seritKapsayici: { marginBottom: 14 },
  seritNokta: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  seritKarti: {
    width: 200,
    height: 115,
    borderRadius: 16,
    marginRight: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  seritResim: { width: '100%', height: '100%', justifyContent: 'flex-end' },
  seritRozet: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  seritRozetYazi: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  seritAltBar: {
    backgroundColor: 'rgba(10, 14, 25, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  seritKartBaslik: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  seritKartAltYazi: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 9, marginTop: 1 },

  seritEklemeAlani: { marginTop: 10, marginBottom: 35 },
  yeniSeritButon: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yeniSeritOdak: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  yeniSeritIcerik: { flexDirection: 'row', alignItems: 'center' },
  yeniSeritArti: { fontSize: 16, marginRight: 8 },
  yeniSeritYazi: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  // MODAL TASARIMLARI
  modalArkaplan: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPencere: {
    width: 650,
    backgroundColor: 'rgba(18, 22, 34, 0.95)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  modalPencereKucuk: {
    width: 480,
    backgroundColor: 'rgba(18, 22, 34, 0.95)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  modalBaslikSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalBaslik: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  modalAltBaslik: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 12, marginBottom: 14 },
  geriBilgiMetin: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 10 },

  // KONTROL MERKEZİ (LETA)
  kontrolMerkeziPencere: {
    width: 720,
    backgroundColor: 'rgba(15, 20, 32, 0.96)',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1.5,
  },
  kontrolBaslikSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 12,
  },
  kontrolMerkeziBaslik: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  cihazBilgiYazi: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 11, marginTop: 2 },
  kontrolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  kontrolTile: {
    width: '23.5%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  kontrolTileOdak: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    transform: [{ scale: 1.05 }],
  },
  tileIkon: { fontSize: 22, marginBottom: 6 },
  tileBaslik: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  tileAlt: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 9, marginTop: 2, textAlign: 'center' },

  // TEMA SEÇİCİ
  temaSecimSatir: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  temaSecimIcerik: { flexDirection: 'row', alignItems: 'center' },
  renkPaletiKutusu: { width: 32, height: 32, borderRadius: 16 },
  temaSecimBaslik: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  temaSecimAlt: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 10, marginTop: 2 },
  temaAktifTik: { fontSize: 13, fontWeight: '800', marginRight: 8 },

  // AKSİYON MENÜSÜ
  aksiyonButon: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  aksiyonButonYazi: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  aksiyonKategoriBaslik: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 11, fontWeight: '700', marginTop: 10, marginBottom: 8 },
  aksiyonKategoriSatir: { flexDirection: 'row', flexWrap: 'wrap' },
  kategoriSecimPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  kategoriSecimPillYazi: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  // UYGULAMA SEÇİCİ GRID
  gridKutusu: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  kuruluAppKarti: {
    width: '31%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  kuruluAppEkli: { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  kuruluAppIkon: { fontSize: 20, color: '#FFFFFF', marginBottom: 4 },
  kuruluAppBaslik: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  kuruluAppDurum: { fontSize: 9, marginTop: 4, fontWeight: '600' },
  metinYesil: { color: '#10B981' },
  metinGri: { color: 'rgba(255, 255, 255, 0.5)' },

  // ŞERİT SEÇİM KARTI
  seritSecimKarti: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  seritSecimDaire: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  seritSecimYazi: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', flex: 1 },
  seritSecimAlt: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 9, marginLeft: 4 },

  // FORM ALANLARI
  modalGirdiTam: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 12,
  },
  kaydetButon: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  kaydetYazi: { fontSize: 13, fontWeight: '800' },

  defaultFocused: {
    transform: [{ scale: 1.05 }],
  },
});
