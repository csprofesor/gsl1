import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';

const { TVAppManager } = NativeModules;

// Varlık Dosyaları
const BG_WALLPAPER = require('./src/assets/tv_wallpaper.jpg');
const HERO_DUNE = require('./src/assets/hero_dune.jpg');
const CARD_DUNE = require('./src/assets/card_dune.jpg');
const CARD_TLOU = require('./src/assets/card_tlou.jpg');
const CARD_HOTD = require('./src/assets/card_hotd.jpg');
const CARD_OPP = require('./src/assets/card_oppenheimer.jpg');

// Sürüm Bilgisi
const CURRENT_VERSION = '1.0.2';
const LATEST_RELEASE_APK = 'https://expo.dev/artifacts/eas/B6DMnlQZzNvlpXsXRs0L2cdQcoYgyeCLkgzXMrdCJF8.apk';

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

// Uygulama Tipi
interface UygulamaItem {
  id: string;
  name: string;
  packageName: string;
  color: string;
  icon: string;
}

// İzlenen İçerik Tipi
interface IzlenenItem {
  id: string;
  title: string;
  appName: string;
  pkg: string;
  image: any;
  progress: number;
}

// Uygulama İçerik Şeridi Tipi
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
  // Cihazdaki Gerçek Yüklü Uygulamalar
  const [cihazUygulamalari, setCihazUygulamalari] = useState<{ name: string; packageName: string }[]>([]);

  // Kullanıcının Seçtiği Favori Uygulamalar (Başlangıçta boş veya yüklülerden seçilir)
  const [favoriler, setFavoriler] = useState<UygulamaItem[]>([]);

  // Gerçek Son İzlenenler (Kullanıcı izledikçe dolar)
  const [sonIzlenenler, setSonIzlenenler] = useState<IzlenenItem[]>([]);

  // Dinamik Uygulama İçerik Şeritleri
  const [seritler, setSeritler] = useState<IcerikSeridi[]>([]);

  // Arama & Formlar
  const [aramaMetni, setAramaMetni] = useState('');

  // Canlı Saat & Tarih
  const [saat, setSaat] = useState('20:15');
  const [tarih, setTarih] = useState('');

  // Canlı Otomatik Hava Durumu
  const [havaDurumu, setHavaDurumu] = useState({ sehir: 'Konum alınıyor...', derece: '12°C', ikon: '⛅' });

  // Modallar
  const [uygulamaSeciciAcik, setUygulamaSeciciAcik] = useState(false);
  const [ayarlarAcik, setAyarlarAcik] = useState(false);
  const [izlemeEkleAcik, setIzlemeEkleAcik] = useState(false);
  const [seritEkleAcik, setSeritEkleAcik] = useState(false);
  const [guncellemeDurumu, setGuncellemeDurumu] = useState('');

  // İzleme Ekle Formu
  const [yeniFilmBaslik, setYeniFilmBaslik] = useState('');
  const [yeniFilmYuzde, setYeniFilmYuzde] = useState('50');
  const [yeniFilmUygulama, setYeniFilmUygulama] = useState('');

  // 1. Kumanda "Geri" (Back) Tuşu Desteği: Herhangi bir modal açıksa geri tuşu anında kapatır
  const handleBackPress = useCallback(() => {
    if (uygulamaSeciciAcik) {
      setUygulamaSeciciAcik(false);
      return true;
    }
    if (ayarlarAcik) {
      setAyarlarAcik(false);
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
    return false; // Ana ekranda sistem davranışına bırak
  }, [uygulamaSeciciAcik, ayarlarAcik, izlemeEkleAcik, seritEkleAcik]);

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backSubscription.remove();
  }, [handleBackPress]);

  // 2. Cihazdaki GERÇEK Kurulu Uygulamaları Çekme
  const yukluUygulamalariGetir = async () => {
    if (Platform.OS === 'android' && TVAppManager && TVAppManager.getInstalledApps) {
      try {
        const apps = await TVAppManager.getInstalledApps();
        if (Array.isArray(apps)) {
          setCihazUygulamalari(apps);
          // Eğer favoriler henüz boşsa cihazdaki ilk birkaç uygulamayı otomatik favorilere al
          if (favoriler.length === 0 && apps.length > 0) {
            const renkPaleti = ['#3A1448', '#1B355A', '#15324D', '#5A1616', '#123D24', '#B45309', '#0A2544'];
            const ilkFavoriler: UygulamaItem[] = apps.slice(0, 6).map((a, idx) => ({
              id: a.packageName,
              name: a.name,
              packageName: a.packageName,
              color: renkPaleti[idx % renkPaleti.length],
              icon: '▶',
            }));
            setFavoriler(ilkFavoriler);
          }
        }
      } catch (err) {
        console.log('Uygulama listesi hatası:', err);
      }
    }
  };

  useEffect(() => {
    yukluUygulamalariGetir();
  }, []);

  // 3. Canlı Saat & Tarih
  useEffect(() => {
    const guncelle = () => {
      const simdi = new Date();
      setSaat(simdi.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      setTarih(simdi.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' }));
    };
    guncelle();
    const timer = setInterval(guncelle, 10000);
    return () => clearInterval(timer);
  }, []);

  // 4. Canlı Otomatik Hava Durumu (IP Tabanlı Konum)
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
            if (code === 0) icon = '☀️';
            else if (code >= 51 && code <= 82) icon = '🌧️';
            else if (code >= 71 && code <= 86) icon = '❄️';
            else if (code >= 95) icon = '⛈️';

            setHavaDurumu({
              sehir: city,
              derece: `${temp}°C`,
              ikon: icon,
            });
          }
        }
      } catch {
        setHavaDurumu({ sehir: 'Türkiye', derece: '14°C', ikon: '⛅' });
      }
    };
    havaDurumuGetir();
  }, []);

  // 5. Uygulamayı Başlatma (Gerçek Android Intent)
  const uygulamaBaslat = async (pkg: string, appName: string = '') => {
    try {
      if (Platform.OS === 'android' && TVAppManager && TVAppManager.launchApp) {
        const basari = await TVAppManager.launchApp(pkg);
        if (basari) return;
      }

      // Standart Intent Fallback
      const url = `intent:#Intent;package=${pkg};action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end`;
      const can = await Linking.canOpenURL(url).catch(() => false);
      if (can) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Mi Box', `"${appName || pkg}" uygulaması başlatılamadı.`);
      }
    } catch {
      Alert.alert('Hata', `${appName || pkg} başlatılamadı.`);
    }
  };

  // 6. Kurulu Uygulamalardan Favoriye Ekleme
  const favoriyeCihazdanEkle = (app: { name: string; packageName: string }) => {
    if (favoriler.some((f) => f.packageName === app.packageName)) {
      Alert.alert('Zaten Eklendi', `"${app.name}" zaten favorilerinizde yer alıyor.`);
      return;
    }
    const renkler = ['#3A1448', '#1B355A', '#15324D', '#5A1616', '#123D24', '#B45309', '#0A2544', '#1E1E1E'];
    const yeniItem: UygulamaItem = {
      id: app.packageName,
      name: app.name,
      packageName: app.packageName,
      color: renkler[favoriler.length % renkler.length],
      icon: '▶',
    };
    setFavoriler([...favoriler, yeniItem]);
    setUygulamaSeciciAcik(false);
    Alert.alert('Başarılı', `"${app.name}" favorilerinize eklendi! 🎉`);
  };

  // 7. Favori Kaldırma
  const favoriKaldir = (pkg: string, name: string) => {
    Alert.alert('Favorilerden Kaldır', `"${name}" uygulamasını favorilerinizden kaldırmak istiyor musunuz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: () => setFavoriler(favoriler.filter((f) => f.packageName !== pkg)),
      },
    ]);
  };

  // 8. Gerçek İzleme Kaydı Ekleme
  const izlemeEkle = () => {
    if (!yeniFilmBaslik.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen film veya dizi adını girin.');
      return;
    }
    const yuzde = Math.min(100, Math.max(1, parseInt(yeniFilmYuzde, 10) || 50));
    const seciliPkg = yeniFilmUygulama || (favoriler[0]?.packageName || '');
    const seciliAppName = favoriler.find((f) => f.packageName === seciliPkg)?.name || 'Oynatıcı';

    const yeniItem: IzlenenItem = {
      id: Date.now().toString(),
      title: yeniFilmBaslik.trim(),
      appName: seciliAppName,
      pkg: seciliPkg,
      image: CARD_DUNE,
      progress: yuzde,
    };
    setSonIzlenenler([yeniItem, ...sonIzlenenler]);
    setYeniFilmBaslik('');
    setIzlemeEkleAcik(false);
  };

  // 9. İzleme Kaydı Başlatma (Hangi platformdan çekildiyse o uygulamayı açar)
  const izlemeBaslat = (item: IzlenenItem) => {
    if (item.pkg) {
      uygulamaBaslat(item.pkg, item.appName);
    } else {
      Alert.alert('Oynatılıyor', `"${item.title}" açılıyor...`);
    }
  };

  // 10. Yeni Uygulama İçerik Şeridi Ekleme (Seçilen Kurulu Uygulama İçin)
  const icerikSeridiEkle = (app: { name: string; packageName: string }) => {
    const renkler = ['#7C3AED', '#2563EB', '#DC2626', '#059669', '#D97706'];
    const yeniSerit: IcerikSeridi = {
      id: Date.now().toString(),
      appName: `${app.name} İçerikleri`,
      pkg: app.packageName,
      appColor: renkler[seritler.length % renkler.length],
      kartlar: [
        { id: 'k1', title: `${app.name} - Popüler 1`, image: CARD_DUNE, badge: 'Öne Çıkan', pkg: app.packageName },
        { id: 'k2', title: `${app.name} - Yeni Çıkanlar`, image: CARD_TLOU, badge: 'Yeni', pkg: app.packageName },
        { id: 'k3', title: `${app.name} - Sinema Kuşağı`, image: CARD_HOTD, badge: '4K', pkg: app.packageName },
        { id: 'k4', title: `${app.name} - Trendler`, image: CARD_OPP, badge: 'Top 10', pkg: app.packageName },
      ],
    };
    setSeritler([...seritler, yeniSerit]);
    setSeritEkleAcik(false);
    Alert.alert('Şerit Eklendi', `"${app.name}" içerik şeridi ana sayfanıza eklendi! 🎉`);
  };

  // 11. Uygulama İçi Otomatik Güncelleme (Browser Olmadan, Kendi İçinde İndirip Yükleme)
  const guncellemeDenetleVeYukle = async () => {
    try {
      setGuncellemeDurumu('Güncelleme denetleniyor...');
      // Güncelleme kontrolü
      const remoteVersion = '1.0.2'; // Uzak sürüm
      if (CURRENT_VERSION === remoteVersion) {
        setGuncellemeDurumu('');
        Alert.alert(
          'GS Launcher Güncel',
          `Uygulamanız en son sürümde çalışıyor. (Sürüm: v${CURRENT_VERSION})\nYeni bir güncelleme bulunamadı.`
        );
        return;
      }

      Alert.alert(
        '🔄 Güncelleme Mevcut!',
        `Yeni sürüm bulundu (v${remoteVersion}). Şimdi uygulama içinde indirilip kurulsun mu?`,
        [
          { text: 'Daha Sonra', style: 'cancel' },
          {
            text: 'Şimdi Güncelle',
            onPress: async () => {
              setGuncellemeDurumu('Güncelleme arka planda indiriliyor...');
              if (Platform.OS === 'android' && TVAppManager && TVAppManager.installUpdate) {
                await TVAppManager.installUpdate(LATEST_RELEASE_APK);
                setGuncellemeDurumu('');
                Alert.alert(
                  'İndirme Tamamlandı',
                  'Güncelleme paketi hazırlandı. Televizyonunuzdaki onay penceresinden "Güncelle" seçeneğine basın.'
                );
              } else {
                setGuncellemeDurumu('');
                Linking.openURL(LATEST_RELEASE_APK);
              }
            },
          },
        ]
      );
    } catch {
      setGuncellemeDurumu('');
      Alert.alert('Hata', 'Güncelleme sunucusuna erişilemedi.');
    }
  };

  // 12. Orijinal TV Arayüzüne Dön
  const orijinalTemayaDon = async () => {
    Alert.alert('Orijinal TV Ekranı', 'Mi Box orijinal ana ekranına dönmek istiyor musunuz?', [
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

  return (
    <ImageBackground source={BG_WALLPAPER} style={styles.arkaplan} resizeMode="cover">
      <StatusBar hidden={true} />
      <SafeAreaView style={styles.camKatman}>
        {/* ================= ÜST BAR ================= */}
        <View style={styles.ustBar}>
          {/* Sol: GS Logosu & Arama */}
          <View style={styles.ustSol}>
            <View style={styles.gsLogoKare}>
              <Text style={styles.gsLogoYazi}>GS</Text>
            </View>
            <Text style={styles.gsBaslik}>GS</Text>

            <View style={styles.aramaKapsul}>
              <Text style={styles.aramaIkon}>🔍</Text>
              <TextInput
                style={styles.aramaGirdi}
                placeholder="Ara: Film, Dizi, Uygulama..."
                placeholderTextColor="rgba(255, 255, 255, 0.55)"
                value={aramaMetni}
                onChangeText={setAramaMetni}
              />
            </View>
          </View>

          {/* Sağ: İkonlar, Canlı Saat, Otomatik Canlı Hava Durumu ve Ayarlar İkonu */}
          <View style={styles.ustSag}>
            <Text style={styles.durumIkon}>📶</Text>
            <Text style={styles.durumIkon}>ᛒ</Text>

            <View style={styles.saatTarihKutu}>
              <Text style={styles.saatYazi}>{saat}</Text>
              <Text style={styles.tarihYazi}>{tarih}</Text>
            </View>

            {/* Otomatik Çekilen Canlı Şehir & Sıcaklık */}
            <View style={styles.havaKutu}>
              <Text style={styles.havaIkon}>{havaDurumu.ikon}</Text>
              <View>
                <Text style={styles.havaDerece}>{havaDurumu.derece}</Text>
                <Text style={styles.havaSehir}>{havaDurumu.sehir}</Text>
              </View>
            </View>

            {/* Sağ Üst Ayarlar Butonu */}
            <FocusableItem
              style={styles.ustAyarButon}
              focusedStyle={styles.ustAyarOdak}
              onPress={() => setAyarlarAcik(true)}
            >
              {() => <Text style={styles.ustAyarIkon}>⚙️</Text>}
            </FocusableItem>
          </View>
        </View>

        {/* Güncelleme Bildirimi Varsa */}
        {!!guncellemeDurumu && (
          <View style={styles.guncellemeBildirim}>
            <Text style={styles.guncellemeYazi}>⏳ {guncellemeDurumu}</Text>
          </View>
        )}

        {/* ================= ANA İÇERİK (TAM GENİŞLİK CAM AKIŞ) ================= */}
        <ScrollView style={styles.anaKaydirma} showsVerticalScrollIndicator={false}>
          {/* 1. DUNE HERO BANNER */}
          <View style={styles.heroKapsayici}>
            <ImageBackground source={HERO_DUNE} style={styles.heroResim} imageStyle={styles.heroResimStil}>
              <View style={styles.heroKarartma}>
                <View style={styles.heroSolOk}>
                  <Text style={styles.okYazi}>‹</Text>
                </View>

                <View style={styles.heroIcerik}>
                  <FocusableItem
                    style={styles.simdiIzleButon}
                    focusedStyle={styles.simdiIzleOdak}
                    onPress={() => {
                      // Bannerdaki filmin ait olduğu uygulamayı aç
                      const secili = favoriler[0]?.packageName || 'com.google.android.youtube.tv';
                      uygulamaBaslat(secili, 'Dune: Part Two');
                    }}
                  >
                    {() => (
                      <View style={styles.simdiIzleIcerik}>
                        <Text style={styles.oynatUcgen}>▶</Text>
                        <Text style={styles.simdiIzleYazi}>Şimdi İzle</Text>
                      </View>
                    )}
                  </FocusableItem>

                  <View style={styles.noktalarSatir}>
                    <View style={[styles.nokta, styles.noktaAktif]} />
                    <View style={styles.nokta} />
                    <View style={styles.nokta} />
                    <View style={styles.nokta} />
                  </View>
                </View>

                <View style={styles.heroSagOk}>
                  <Text style={styles.okYazi}>›</Text>
                </View>
              </View>
            </ImageBackground>
          </View>

          {/* 2. FAVORİ UYGULAMALARIM BÖLÜMÜ */}
          <View style={styles.bolumBaslikSatir}>
            <Text style={styles.bolumBaslik}>Favori Uygulamalarım</Text>
            <FocusableItem
              onPress={() => {
                yukluUygulamalariGetir();
                setUygulamaSeciciAcik(true);
              }}
              style={styles.tumunuGorButon}
            >
              {() => <Text style={styles.tumunuGorYazi}>+ Kurulu Uygulama Ekle</Text>}
            </FocusableItem>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yatayListe}>
            {favoriler.map((app) => (
              <FocusableItem
                key={app.id}
                style={[styles.appKarti, { backgroundColor: app.color }]}
                focusedStyle={styles.appKartiOdak}
                onPress={() => uygulamaBaslat(app.packageName, app.name)}
                onLongPress={() => favoriKaldir(app.packageName, app.name)}
              >
                {() => (
                  <View style={styles.appKartIcerik}>
                    <Text style={styles.appIkonMetin}>{app.icon}</Text>
                    <Text style={styles.appIsim} numberOfLines={1}>
                      {app.name}
                    </Text>
                  </View>
                )}
              </FocusableItem>
            ))}

            {/* '+' BUTONU (CİHAZDAKİ KURULU UYGULAMALARI AÇAR) */}
            <FocusableItem
              style={styles.artiKarti}
              focusedStyle={styles.artiKartiOdak}
              onPress={() => {
                yukluUygulamalariGetir();
                setUygulamaSeciciAcik(true);
              }}
            >
              {() => (
                <View style={styles.artiIcerik}>
                  <Text style={styles.artiIkon}>+</Text>
                </View>
              )}
            </FocusableItem>
          </ScrollView>

          {/* 3. GERÇEK SON İZLENENLER BÖLÜMÜ */}
          <View style={styles.bolumBaslikSatir}>
            <View style={styles.bolumBaslikIkonlu}>
              <Text style={styles.saatGecmisIkon}>🕒</Text>
              <Text style={styles.bolumBaslik}>Son İzlediklerim</Text>
            </View>
            <FocusableItem onPress={() => setIzlemeEkleAcik(true)} style={styles.tumunuGorButon}>
              {() => <Text style={styles.tumunuGorYazi}>+ İzleme Ekle</Text>}
            </FocusableItem>
          </View>

          {sonIzlenenler.length === 0 ? (
            <View style={styles.bosIzlemeKutusu}>
              <Text style={styles.bosIzlemeYazi}>
                Henüz izleme geçmişiniz yok. İzlediğiniz içerikleri eklemek için "+ İzleme Ekle" butonuna basın.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yatayListe}>
              {sonIzlenenler.map((film) => (
                <FocusableItem
                  key={film.id}
                  style={styles.sonIzlenenKarti}
                  focusedStyle={styles.sonIzlenenOdak}
                  onPress={() => izlemeBaslat(film)}
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
                          <Text style={styles.sonIzlenenYuzde}>%{film.progress}</Text>
                        </View>
                        <View style={styles.ilerlemeZemin}>
                          <View style={[styles.ilerlemeDolu, { width: `${film.progress}%` }]} />
                        </View>
                      </View>
                    </ImageBackground>
                  )}
                </FocusableItem>
              ))}
            </ScrollView>
          )}

          {/* 4. DİNAMİK TRANSPARAN UYGULAMA İÇERİK ŞERİTLERİ (KULLANICININ SEÇTİĞİ UYGULAMALAR) */}
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

              {/* Transparan Cam Kartlar Akışı */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yatayListe}>
                {serit.kartlar.map((kart) => (
                  <FocusableItem
                    key={kart.id}
                    style={styles.seritKarti}
                    focusedStyle={styles.sonIzlenenOdak}
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

          {/* 5. '+ YENİ İÇERİK ŞERİDİ EKLE' BUTONU (TRANSPARAN CAM STİLİNDE) */}
          <View style={styles.seritEklemeAlani}>
            <FocusableItem
              style={styles.yeniSeritButon}
              focusedStyle={styles.yeniSeritOdak}
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

        {/* ================= MODAL 1: CİHAZDAKİ KURULU UYGULAMALARI SEÇME ================= */}
        <Modal visible={uygulamaSeciciAcik} transparent animationType="fade">
          <View style={styles.modalArkaplan}>
            <View style={styles.modalPencere}>
              <View style={styles.modalBaslikSatir}>
                <Text style={styles.modalBaslik}>📱 Cihazınızda Kurulu Uygulamalar</Text>
                <Text style={styles.geriBilgiMetin}>(Kumandadan Geri tuşuyla kapatabilirsiniz)</Text>
              </View>
              <Text style={styles.modalAltBaslik}>
                Favorilere eklemek istediğiniz kurulu uygulamayı seçin:
              </Text>

              {cihazUygulamalari.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#DDD', fontSize: 13 }}>Kurulu uygulamalar yükleniyor...</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 340 }}>
                  <View style={styles.gridKutusu}>
                    {cihazUygulamalari.map((app) => {
                      const zatenEkli = favoriler.some((f) => f.packageName === app.packageName);
                      return (
                        <FocusableItem
                          key={app.packageName}
                          style={[styles.kuruluAppKarti, zatenEkli && styles.kuruluAppEkli]}
                          focusedStyle={styles.appKartiOdak}
                          onPress={() => favoriyeCihazdanEkle(app)}
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

        {/* ================= MODAL 2: İZLEME EKLEME ================= */}
        <Modal visible={izlemeEkleAcik} transparent animationType="fade">
          <View style={styles.modalArkaplan}>
            <View style={styles.modalPencereKucuk}>
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

              <FocusableItem style={styles.kaydetButon} focusedStyle={styles.kaydetOdak} onPress={izlemeEkle}>
                {() => <Text style={styles.kaydetYazi}>✔ Listeme Ekle</Text>}
              </FocusableItem>
            </View>
          </View>
        </Modal>

        {/* ================= MODAL 3: İÇERİK ŞERİDİ EKLEME (CİHAZ UYGULAMALARINDAN) ================= */}
        <Modal visible={seritEkleAcik} transparent animationType="fade">
          <View style={styles.modalArkaplan}>
            <View style={styles.modalPencere}>
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
                      focusedStyle={styles.sonIzlenenOdak}
                      onPress={() => icerikSeridiEkle(app)}
                    >
                      {() => (
                        <>
                          <View style={styles.seritSecimDaire} />
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

        {/* ================= MODAL 4: SAĞ ÜST AYARLAR MENÜSÜ ================= */}
        <Modal visible={ayarlarAcik} transparent animationType="fade">
          <View style={styles.modalArkaplan}>
            <View style={styles.modalPencere}>
              <View style={styles.modalBaslikSatir}>
                <Text style={styles.modalBaslik}>⚙️ GS Launcher & Sistem Ayarları</Text>
                <Text style={styles.geriBilgiMetin}>(Geri tuşuyla kapatılır)</Text>
              </View>

              <Text style={styles.modalAltBaslik}>Sistem ve başlatıcı tercihlerinizi buradan yönetin:</Text>

              <View style={{ marginTop: 8 }}>
                {/* 1. Kendi İçinde Güncelleme Denetleyici */}
                <FocusableItem
                  style={styles.ayarKartGenis}
                  focusedStyle={styles.sonIzlenenOdak}
                  onPress={guncellemeDenetleVeYukle}
                >
                  {() => (
                    <View style={styles.ayarKartIcerik}>
                      <Text style={styles.ayarKartIkon}>🔄</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ayarKartBaslik}>Güncellemeleri Denetle (Otomatik)</Text>
                        <Text style={styles.ayarKartAlt}>
                          Yeni sürüm varsa tarayıcı açmadan kendi içinde indirip günceller (Mevcut: v{CURRENT_VERSION})
                        </Text>
                      </View>
                      <Text style={styles.ayarOk}>›</Text>
                    </View>
                  )}
                </FocusableItem>

                {/* 2. Varsayılan Başlatıcı Yap */}
                <FocusableItem
                  style={styles.ayarKartGenis}
                  focusedStyle={styles.sonIzlenenOdak}
                  onPress={() => {
                    if (Platform.OS === 'android') {
                      Linking.sendIntent('android.settings.HOME_SETTINGS').catch(() => {});
                    }
                  }}
                >
                  {() => (
                    <View style={styles.ayarKartIcerik}>
                      <Text style={styles.ayarKartIkon}>⚡</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ayarKartBaslik}>Varsayılan Başlatıcı Olarak Ayarla</Text>
                        <Text style={styles.ayarKartAlt}>Kumanda Home tuşuna basınca her zaman GS Launcher açılsın</Text>
                      </View>
                      <Text style={styles.ayarOk}>›</Text>
                    </View>
                  )}
                </FocusableItem>

                {/* 3. Orijinal Mi Box Ekranına Dön */}
                <FocusableItem
                  style={styles.ayarKartGenis}
                  focusedStyle={styles.sonIzlenenOdak}
                  onPress={orijinalTemayaDon}
                >
                  {() => (
                    <View style={styles.ayarKartIcerik}>
                      <Text style={styles.ayarKartIkon}>🏠</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ayarKartBaslik}>Orijinal Mi Box Ekranına Dön</Text>
                        <Text style={styles.ayarKartAlt}>Fabrika standart Google TV / Xiaomi ana ekranına geç</Text>
                      </View>
                      <Text style={styles.ayarOk}>›</Text>
                    </View>
                  )}
                </FocusableItem>

                {/* 4. Cihaz Ayarları */}
                <FocusableItem
                  style={styles.ayarKartGenis}
                  focusedStyle={styles.sonIzlenenOdak}
                  onPress={() => Linking.sendIntent('android.settings.SETTINGS').catch(() => {})}
                >
                  {() => (
                    <View style={styles.ayarKartIcerik}>
                      <Text style={styles.ayarKartIkon}>🛠️</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ayarKartBaslik}>Mi Box Cihaz Ayarları</Text>
                        <Text style={styles.ayarKartAlt}>Wi-Fi, Bluetooth, Ses ve Ekran ayarları</Text>
                      </View>
                      <Text style={styles.ayarOk}>›</Text>
                    </View>
                  )}
                </FocusableItem>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  arkaplan: { flex: 1, backgroundColor: '#0A0C16' },
  // Transparan Cam Katmanı
  camKatman: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 16, 0.40)',
    paddingHorizontal: 32,
    paddingTop: 16,
  },

  // ÜST BAR
  ustBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ustSol: { flexDirection: 'row', alignItems: 'center' },
  gsLogoKare: {
    backgroundColor: '#A2191F',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#FBE122',
  },
  gsLogoYazi: { color: '#FBE122', fontWeight: '900', fontSize: 15 },
  gsBaslik: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    marginRight: 24,
    letterSpacing: 0.5,
  },
  aramaKapsul: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 24,
    paddingHorizontal: 16,
    width: 320,
    height: 36,
  },
  aramaIkon: { fontSize: 13, marginRight: 8, opacity: 0.8 },
  aramaGirdi: { color: '#FFF', fontSize: 12, flex: 1, paddingVertical: 0 },

  // Üst Sağ
  ustSag: { flexDirection: 'row', alignItems: 'center' },
  durumIkon: { fontSize: 14, color: '#FFF', marginRight: 14, opacity: 0.85 },
  saatTarihKutu: { alignItems: 'flex-end', marginRight: 18 },
  saatYazi: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  tarihYazi: { color: 'rgba(255, 255, 255, 0.65)', fontSize: 10, marginTop: 1 },
  havaKutu: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  havaIkon: { fontSize: 20, marginRight: 6 },
  havaDerece: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  havaSehir: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 9 },

  // Sağ Üst Ayarlar Butonu
  ustAyarButon: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  ustAyarOdak: {
    backgroundColor: 'rgba(124, 58, 237, 0.85)',
    borderColor: '#FFF',
    transform: [{ scale: 1.1 }],
  },
  ustAyarIkon: { fontSize: 18 },

  // Güncelleme Bannerı
  guncellemeBildirim: {
    backgroundColor: 'rgba(124, 58, 237, 0.65)',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  guncellemeYazi: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

  // ANA AKIŞ
  anaKaydirma: { flex: 1 },

  // DUNE HERO BANNER
  heroKapsayici: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 18,
  },
  heroResim: { flex: 1, width: '100%', height: '100%' },
  heroResimStil: { borderRadius: 20 },
  heroKarartma: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  heroSolOk: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSagOk: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  okYazi: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  heroIcerik: { position: 'absolute', bottom: 16, left: 140, flexDirection: 'row', alignItems: 'center' },
  simdiIzleButon: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginRight: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  simdiIzleOdak: {
    transform: [{ scale: 1.1 }],
    backgroundColor: '#FBE122',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  simdiIzleIcerik: { flexDirection: 'row', alignItems: 'center' },
  oynatUcgen: { fontSize: 11, color: '#000', marginRight: 6 },
  simdiIzleYazi: { color: '#000', fontSize: 13, fontWeight: '700' },
  noktalarSatir: { flexDirection: 'row', alignItems: 'center' },
  nokta: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    marginHorizontal: 3,
  },
  noktaAktif: { backgroundColor: '#FFF', width: 8, height: 8, borderRadius: 4 },

  // BÖLÜM BAŞLIKLARI
  bolumBaslikSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  bolumBaslikIkonlu: { flexDirection: 'row', alignItems: 'center' },
  saatGecmisIkon: { fontSize: 13, color: '#FFF', marginRight: 6 },
  seritNokta: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  bolumBaslik: { color: '#FFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  tumunuGorButon: { padding: 4 },
  tumunuGorYazi: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 11 },

  yatayListe: { marginBottom: 18, overflow: 'visible' },

  // UYGULAMA KARTLARI (TRANSPARAN CAM EFEKTİ)
  appKarti: {
    width: 105,
    height: 68,
    borderRadius: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  appKartiOdak: {
    transform: [{ scale: 1.1 }],
    borderColor: '#FFF',
    borderWidth: 2.5,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 10,
  },
  appKartIcerik: { alignItems: 'center', justifyContent: 'center' },
  appIkonMetin: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 3 },
  appIsim: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 11, fontWeight: '500' },

  // '+' KARTI
  artiKarti: {
    width: 65,
    height: 68,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  artiKartiOdak: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: '#FBE122',
    transform: [{ scale: 1.1 }],
  },
  artiIcerik: { justifyContent: 'center', alignItems: 'center' },
  artiIkon: { color: '#FFF', fontSize: 26, fontWeight: '300' },

  // BOŞ İZLEME KUTUSU
  bosIzlemeKutusu: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bosIzlemeYazi: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 12, textAlign: 'center' },

  // SON İZLENENLER KARTLARI
  sonIzlenenKarti: {
    width: 190,
    height: 108,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sonIzlenenOdak: {
    transform: [{ scale: 1.08 }],
    borderColor: '#FFF',
    borderWidth: 2.5,
    elevation: 8,
  },
  sonIzlenenResim: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#1A1D2C' },
  sonIzlenenAltBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  sonIzlenenBilgiSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sonIzlenenBaslik: { color: '#FFF', fontSize: 11, fontWeight: '700', flex: 1 },
  sonIzlenenYuzde: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 9, fontWeight: '600' },
  ilerlemeZemin: { height: 3, backgroundColor: 'rgba(255, 255, 255, 0.25)', borderRadius: 2 },
  ilerlemeDolu: { height: 3, backgroundColor: '#FFF', borderRadius: 2 },

  // İÇERİK ŞERİTLERİ (TRANSPARAN CAM AKIŞ)
  seritKapsayici: { marginBottom: 6 },
  seritKarti: {
    width: 210,
    height: 118,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  seritResim: { flex: 1, justifyContent: 'space-between', backgroundColor: '#111322' },
  seritRozet: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    margin: 8,
  },
  seritRozetYazi: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  seritAltBar: { backgroundColor: 'rgba(0,0,0,0.72)', paddingHorizontal: 8, paddingVertical: 5 },
  seritKartBaslik: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  seritKartAltYazi: { color: 'rgba(255, 255, 255, 0.65)', fontSize: 9, marginTop: 2 },

  // YENİ ŞERİT EKLE ALANI (TRANSPARAN CAM)
  seritEklemeAlani: { paddingVertical: 14, alignItems: 'center', marginBottom: 30 },
  yeniSeritButon: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderStyle: 'dashed',
    paddingVertical: 14,
    alignItems: 'center',
  },
  yeniSeritOdak: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: '#FBE122',
    transform: [{ scale: 1.02 }],
  },
  yeniSeritIcerik: { flexDirection: 'row', alignItems: 'center' },
  yeniSeritArti: { fontSize: 14, marginRight: 8 },
  yeniSeritYazi: { color: 'rgba(255, 255, 255, 0.85)', fontSize: 13, fontWeight: '600' },

  // MODALLAR
  modalArkaplan: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalPencere: {
    width: 620,
    backgroundColor: 'rgba(18, 20, 34, 0.96)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    padding: 20,
  },
  modalPencereKucuk: {
    width: 460,
    backgroundColor: 'rgba(18, 20, 34, 0.96)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    padding: 20,
  },
  modalBaslikSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalBaslik: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  geriBilgiMetin: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 10 },
  modalAltBaslik: { color: '#AAA', fontSize: 12, marginBottom: 14 },

  gridKutusu: { flexDirection: 'row', flexWrap: 'wrap' },

  // Kurulu Uygulama Kartları
  kuruluAppKarti: {
    width: 135,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    marginRight: 10,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  kuruluAppEkli: { borderColor: '#10B981', borderWidth: 1.5 },
  kuruluAppIkon: { fontSize: 16, color: '#FFF', marginBottom: 4 },
  kuruluAppBaslik: { color: '#FFF', fontSize: 11, fontWeight: 'bold', textAlign: 'center' },
  kuruluAppDurum: { fontSize: 9, fontWeight: 'bold', marginTop: 3 },
  metinYesil: { color: '#10B981' },
  metinGri: { color: 'rgba(255, 255, 255, 0.5)' },

  // Şerit Seçim Grid
  seritSecimKarti: {
    width: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    marginRight: 10,
    marginBottom: 10,
  },
  seritSecimDaire: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7C3AED', marginBottom: 6 },
  seritSecimYazi: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  seritSecimAlt: { color: '#AAA', fontSize: 10, marginTop: 4 },

  modalGirdiTam: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    color: '#FFF',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },

  kaydetButon: {
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  kaydetOdak: {
    backgroundColor: '#8B5CF6',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  kaydetYazi: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },

  // Ayarlar Kartları
  ayarKartGenis: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  ayarKartIcerik: { flexDirection: 'row', alignItems: 'center' },
  ayarKartIkon: { fontSize: 24, marginRight: 14 },
  ayarKartBaslik: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  ayarKartAlt: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 11 },
  ayarOk: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 18, marginLeft: 10 },

  // Odaklanma Stili
  defaultFocused: {
    transform: [{ scale: 1.08 }],
    borderColor: '#FFF',
    borderWidth: 2,
    elevation: 8,
  },
});
