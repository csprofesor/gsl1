import React, { useState, useEffect } from 'react';
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
} from 'react-native';

// Varlık Dosyaları
const BG_WALLPAPER = require('./src/assets/tv_wallpaper.jpg');
const HERO_DUNE = require('./src/assets/hero_dune.jpg');
const CARD_DUNE = require('./src/assets/card_dune.jpg');
const CARD_TLOU = require('./src/assets/card_tlou.jpg');
const CARD_HOTD = require('./src/assets/card_hotd.jpg');
const CARD_OPP = require('./src/assets/card_oppenheimer.jpg');

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

// Başlangıç Favori Uygulamaları
interface UygulamaItem {
  id: string;
  name: string;
  color: string;
  icon: string;
  pkg?: string;
  url?: string;
}

const DEFAULT_FAVORILER: UygulamaItem[] = [
  { id: '1', name: 'Nuvio', color: '#3A1448', icon: '▶', pkg: 'com.nuvio', url: 'nuvio://' },
  { id: '2', name: 'Cloudstream', color: '#1B355A', icon: '☁️', pkg: 'com.lagradost.cloudstream3', url: 'cloudstream://' },
  { id: '3', name: 'Kodi', color: '#15324D', icon: '🔹', pkg: 'org.xbmc.kodi', url: 'org.xbmc.kodi://' },
  { id: '4', name: 'YouTube', color: '#5A1616', icon: '▶', pkg: 'com.google.android.youtube.tv', url: 'vnd.youtube://' },
  { id: '5', name: 'Netflix', color: '#161616', icon: 'N', pkg: 'com.netflix.ninja', url: 'nflx://' },
  { id: '6', name: 'Disney+', color: '#0A2544', icon: 'D+', pkg: 'com.disney.disneyplus', url: 'disneyplus://' },
  { id: '7', name: 'Prime Video', color: '#002B49', icon: 'P', pkg: 'com.amazon.amazonvideo.livingroom', url: 'primevideo://' },
];

// Gerçek İzleme Kayıtları
interface IzlenenItem {
  id: string;
  title: string;
  image: any;
  progress: number;
}

const DEFAULT_IZLENENLER: IzlenenItem[] = [
  { id: '101', title: 'Dune: Part Two', image: CARD_DUNE, progress: 65 },
  { id: '102', title: 'The Last of Us', image: CARD_TLOU, progress: 42 },
  { id: '103', title: 'House of the Dragon', image: CARD_HOTD, progress: 87 },
  { id: '104', title: 'Oppenheimer', image: CARD_OPP, progress: 30 },
];

// Uygulama İçerik Şeritleri (Kanal Satırları - Prime Video / Netflix reklam şeridi gibi)
interface IcerikKarti {
  id: string;
  title: string;
  image: any;
  badge?: string;
}

interface IcerikSeridi {
  id: string;
  appName: string;
  appColor: string;
  pkg: string;
  kartlar: IcerikKarti[];
}

const DEFAULT_SERITLER: IcerikSeridi[] = [
  {
    id: 's_prime',
    appName: 'Prime Video',
    appColor: '#00A8E1',
    pkg: 'com.amazon.amazonvideo.livingroom',
    kartlar: [
      { id: 'pv1', title: 'Yüzüklerin Efendisi: Güç Yüzükleri', image: CARD_HOTD, badge: 'Öne Çıkan' },
      { id: 'pv2', title: 'The Boys - 4. Sezon', image: CARD_OPP, badge: 'Yeni Bölüm' },
      { id: 'pv3', title: 'Reacher', image: CARD_DUNE, badge: 'Top 10' },
      { id: 'pv4', title: 'Fallout', image: CARD_TLOU, badge: 'Popüler' },
    ],
  },
  {
    id: 's_netflix',
    appName: 'Netflix',
    appColor: '#E50914',
    pkg: 'com.netflix.ninja',
    kartlar: [
      { id: 'nf1', title: 'Stranger Things 5', image: CARD_DUNE, badge: 'Yakında' },
      { id: 'nf2', title: 'Squid Game 2', image: CARD_OPP, badge: 'Trend #1' },
      { id: 'nf3', title: 'Black Mirror', image: CARD_TLOU, badge: 'Yeni Sezon' },
      { id: 'nf4', title: 'Wednesday', image: CARD_HOTD, badge: 'Popüler' },
    ],
  },
];

// Popüler TV Uygulama Şablonları (Tek Tıkla Ekleme Kolaylığı İçin)
const HAZIR_UYGULAMALAR = [
  { name: 'Stremio', icon: '🍿', color: '#3F2B68', pkg: 'com.stremio.one' },
  { name: 'TiviMate', icon: '📡', color: '#1A3B44', pkg: 'ar.tvplayer.tv' },
  { name: 'Spotify', icon: '🎵', color: '#123D24', pkg: 'com.spotify.tv.android' },
  { name: 'SmartTube', icon: '📺', color: '#4A1818', pkg: 'com.teamsmart.videomanager.tv' },
  { name: 'VLC', icon: '🟧', color: '#4A2800', pkg: 'org.videolan.vlc' },
  { name: 'Exxen', icon: '🟡', color: '#423800', pkg: 'com.exxen.android' },
  { name: 'BluTV', icon: '🔵', color: '#002B44', pkg: 'com.blutv' },
  { name: 'Gain', icon: '⚪', color: '#2B2B2B', pkg: 'com.gain.tv' },
  { name: 'TOD TV', icon: '🟣', color: '#3B1A40', pkg: 'com.digiturk.tod' },
  { name: 'S Sport+', icon: '⚽', color: '#1A1A3A', pkg: 'com.ssportplus.tv' },
];

export default function App() {
  const [favoriler, setFavoriler] = useState<UygulamaItem[]>(DEFAULT_FAVORILER);
  const [sonIzlenenler, setSonIzlenenler] = useState<IzlenenItem[]>(DEFAULT_IZLENENLER);
  const [seritler, setSeritler] = useState<IcerikSeridi[]>(DEFAULT_SERITLER);
  const [aramaMetni, setAramaMetni] = useState('');

  // Canlı Saat & Tarih
  const [saat, setSaat] = useState('20:15');
  const [tarih, setTarih] = useState('6 Kasım Per');

  // Canlı Hava Durumu (IP Konumuyla Otomatik Çekilir)
  const [havaDurumu, setHavaDurumu] = useState({ sehir: 'Konum alınıyor...', derece: '12°C', ikon: '⛅' });

  // Modallar
  const [ayarlarAcik, setAyarlarAcik] = useState(false);
  const [uygulamaEkleAcik, setUygulamaEkleAcik] = useState(false);
  const [izlemeEkleAcik, setIzlemeEkleAcik] = useState(false);
  const [seritEkleAcik, setSeritEkleAcik] = useState(false);

  // Form State'leri
  const [yeniAppName, setYeniAppName] = useState('');
  const [yeniAppPkg, setYeniAppPkg] = useState('');
  const [yeniAppIcon, setYeniAppIcon] = useState('▶');
  const [yeniAppColor, setYeniAppColor] = useState('#2563EB');

  const [yeniFilmBaslik, setYeniFilmBaslik] = useState('');
  const [yeniFilmYuzde, setYeniFilmYuzde] = useState('50');

  // Canlı Saat & Tarih Güncelleme
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

  // Kullanıcının Kendi Şehrinden Canlı Hava Durumunu Çekme (IP Tabanlı - Ücretsiz & API Key İstemez)
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
        // Hata durumunda varsayılan göster
        setHavaDurumu({ sehir: 'Türkiye', derece: '14°C', ikon: '⛅' });
      }
    };
    havaDurumuGetir();
  }, []);

  // Uygulama Başlatma
  const uygulamaBaslat = async (app: { name: string; pkg?: string; url?: string }) => {
    try {
      const url =
        Platform.OS === 'android' && app.pkg
          ? `intent:#Intent;package=${app.pkg};action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end`
          : app.url || '';

      const destekleniyor = await Linking.canOpenURL(url).catch(() => false);
      if (destekleniyor) {
        await Linking.openURL(url);
      } else if (app.url) {
        const fallback = await Linking.canOpenURL(app.url).catch(() => false);
        if (fallback) {
          await Linking.openURL(app.url);
        } else {
          Alert.alert('Mi Box', `"${app.name}" uygulaması cihazda bulunamadı.`);
        }
      } else {
        Alert.alert('Mi Box', `"${app.name}" uygulaması cihazda bulunamadı.`);
      }
    } catch {
      Alert.alert('Hata', `${app.name} başlatılamadı.`);
    }
  };

  // Yeni Özel Uygulama Ekleme
  const favoriEkle = () => {
    if (!yeniAppName.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen uygulama adını yazın.');
      return;
    }
    const yeniItem: UygulamaItem = {
      id: Date.now().toString(),
      name: yeniAppName.trim(),
      color: yeniAppColor,
      icon: yeniAppIcon,
      pkg: yeniAppPkg.trim() || undefined,
    };
    setFavoriler([...favoriler, yeniItem]);
    setYeniAppName('');
    setYeniAppPkg('');
    setUygulamaEkleAcik(false);
    Alert.alert('Başarılı', `"${yeniItem.name}" favorilerinize eklendi! 🎉`);
  };

  // Favori Uygulama Silme
  const favoriSil = (id: string, name: string) => {
    Alert.alert('Uygulama Kaldır', `"${name}" uygulamasını favorilerden kaldırmak istiyor musunuz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: () => {
          setFavoriler(favoriler.filter((f) => f.id !== id));
        },
      },
    ]);
  };

  // Yeni İzleme Kaydı Ekleme
  const izlemeKaydiEkle = () => {
    if (!yeniFilmBaslik.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen film veya dizi adını yazın.');
      return;
    }
    const yuzde = Math.min(100, Math.max(1, parseInt(yeniFilmYuzde, 10) || 50));
    const yeniIzlenen: IzlenenItem = {
      id: Date.now().toString(),
      title: yeniFilmBaslik.trim(),
      image: CARD_DUNE,
      progress: yuzde,
    };
    setSonIzlenenler([yeniIzlenen, ...sonIzlenenler]);
    setYeniFilmBaslik('');
    setIzlemeEkleAcik(false);
  };

  // İzleme Kaydı Silme
  const izlemeSil = (id: string, title: string) => {
    Alert.alert('Geçmişten Kaldır', `"${title}" izleme geçmişinizden silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          setSonIzlenenler(sonIzlenenler.filter((i) => i.id !== id));
        },
      },
    ]);
  };

  // Yeni İçerik Şeridi (Kanal) Ekleme
  const seritEkle = (appName: string, pkg: string, appColor: string) => {
    const yeniSerit: IcerikSeridi = {
      id: Date.now().toString(),
      appName: `${appName} İçerikleri`,
      appColor: appColor,
      pkg: pkg,
      kartlar: [
        { id: 'c1', title: `${appName} Popüler 1`, image: CARD_DUNE, badge: 'Trend' },
        { id: 'c2', title: `${appName} Yeni Dizi`, image: CARD_TLOU, badge: 'Yeni' },
        { id: 'c3', title: `${appName} Aksiyon`, image: CARD_HOTD, badge: '4K Ultra' },
        { id: 'c4', title: `${appName} Sinema`, image: CARD_OPP, badge: 'Öne Çıkan' },
      ],
    };
    setSeritler([...seritler, yeniSerit]);
    setSeritEkleAcik(false);
    Alert.alert('Şerit Eklendi', `"${appName}" içerik satırı ana sayfanıza eklendi! 🎉`);
  };

  // Varsayılan Başlatıcı Ayarı
  const varsayilanLauncherAyariniAc = async () => {
    try {
      if (Platform.OS === 'android') {
        await Linking.sendIntent('android.settings.HOME_SETTINGS');
      }
    } catch {
      try {
        await Linking.sendIntent('android.settings.SETTINGS');
      } catch {
        Alert.alert('Ayarlar', 'Cihaz ayarları açılamadı.');
      }
    }
  };

  // Orijinal TV Arayüzüne Dön
  const orijinalTemayaDon = async () => {
    Alert.alert('Mi Box', 'Orijinal TV ana ekranına dönmek istiyor musunuz?', [
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
          varsayilanLauncherAyariniAc();
        },
      },
    ]);
  };

  return (
    <ImageBackground source={BG_WALLPAPER} style={styles.arkaplan} resizeMode="cover">
      <StatusBar hidden={true} />
      {/* Transparan Cam Katmanı */}
      <SafeAreaView style={styles.camKatman}>
        {/* ================= ÜST BAR ================= */}
        <View style={styles.ustBar}>
          {/* Sol: Mi Box Logosu & Arama */}
          <View style={styles.ustSol}>
            <View style={styles.miLogoKare}>
              <Text style={styles.miLogoYazi}>mi</Text>
            </View>
            <Text style={styles.miBoxBaslik}>Mi Box</Text>

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

          {/* Sağ: İkonlar, Canlı Saat, Otomatik Hava Durumu ve Ayarlar İkonu */}
          <View style={styles.ustSag}>
            <Text style={styles.durumIkon}>📶</Text>
            <Text style={styles.durumIkon}>ᛒ</Text>

            <View style={styles.saatTarihKutu}>
              <Text style={styles.saatYazi}>{saat}</Text>
              <Text style={styles.tarihYazi}>{tarih}</Text>
            </View>

            {/* Otomatik Çekilen Şehir & Hava Durumu */}
            <View style={styles.havaKutu}>
              <Text style={styles.havaIkon}>{havaDurumu.ikon}</Text>
              <View>
                <Text style={styles.havaDerece}>{havaDurumu.derece}</Text>
                <Text style={styles.havaSehir}>{havaDurumu.sehir}</Text>
              </View>
            </View>

            {/* Sağ Üst Ayarlar Butonu (Sol Menü Yerine) */}
            <FocusableItem
              style={styles.ustAyarButon}
              focusedStyle={styles.ustAyarOdak}
              onPress={() => setAyarlarAcik(true)}
            >
              {() => <Text style={styles.ustAyarIkon}>⚙️</Text>}
            </FocusableItem>
          </View>
        </View>

        {/* ================= ANA İÇERİK (GENİŞ TAM EKRAN AKIŞ) ================= */}
        <ScrollView style={styles.anaKaydirma} showsVerticalScrollIndicator={false}>
          {/* 1. DUNE PART TWO HERO BANNER */}
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
                    onPress={() => Alert.alert('Oynatılıyor', 'Dune: Part Two başlatılıyor...')}
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
            <FocusableItem onPress={() => setUygulamaEkleAcik(true)} style={styles.tumunuGorButon}>
              {() => <Text style={styles.tumunuGorYazi}>+ Uygulama Ekle</Text>}
            </FocusableItem>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yatayListe}>
            {favoriler.map((app) => (
              <FocusableItem
                key={app.id}
                style={[styles.appKarti, { backgroundColor: app.color }]}
                focusedStyle={styles.appKartiOdak}
                onPress={() => uygulamaBaslat(app)}
                onLongPress={() => favoriSil(app.id, app.name)}
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

            {/* '+' FAVORİYE UYGULAMA EKLE KARTI */}
            <FocusableItem
              style={styles.artiKarti}
              focusedStyle={styles.artiKartiOdak}
              onPress={() => setUygulamaEkleAcik(true)}
            >
              {() => (
                <View style={styles.artiIcerik}>
                  <Text style={styles.artiIkon}>+</Text>
                </View>
              )}
            </FocusableItem>
          </ScrollView>

          {/* 3. SON İZLEDİKLERİM BÖLÜMÜ (GERÇEK İZLEME GEÇMİŞİ) */}
          <View style={styles.bolumBaslikSatir}>
            <View style={styles.bolumBaslikIkonlu}>
              <Text style={styles.saatGecmisIkon}>🕒</Text>
              <Text style={styles.bolumBaslik}>Son İzlediklerim</Text>
            </View>
            <FocusableItem onPress={() => setIzlemeEkleAcik(true)} style={styles.tumunuGorButon}>
              {() => <Text style={styles.tumunuGorYazi}>+ İzleme Ekle</Text>}
            </FocusableItem>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yatayListe}>
            {sonIzlenenler.map((film) => (
              <FocusableItem
                key={film.id}
                style={styles.sonIzlenenKarti}
                focusedStyle={styles.sonIzlenenOdak}
                onPress={() => Alert.alert('Oynatıcı', `"${film.title}" %${film.progress} noktasından devam ettiriliyor...`)}
                onLongPress={() => izlemeSil(film.id, film.title)}
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

          {/* 4. DİNAMİK UYGULAMA İÇERİK ŞERİTLERİ (Prime Video, Netflix vb. Reklam/Öneri Şeritleri) */}
          {seritler.map((serit) => (
            <View key={serit.id} style={styles.seritKapsayici}>
              <View style={styles.bolumBaslikSatir}>
                <View style={styles.bolumBaslikIkonlu}>
                  <View style={[styles.seritNokta, { backgroundColor: serit.appColor }]} />
                  <Text style={styles.bolumBaslik}>{serit.appName}</Text>
                </View>
                <FocusableItem
                  onPress={() =>
                    Alert.alert('Şeridi Kaldır', `"${serit.appName}" içerik şeridi kaldırılsın mı?`, [
                      { text: 'Vazgeç', style: 'cancel' },
                      { text: 'Kaldır', onPress: () => setSeritler(seritler.filter((s) => s.id !== serit.id)) },
                    ])
                  }
                  style={styles.tumunuGorButon}
                >
                  {() => <Text style={styles.tumunuGorYazi}>✕ Şeridi Kaldır</Text>}
                </FocusableItem>
              </View>

              {/* Yatay İçerik Kartları Akışı */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yatayListe}>
                {serit.kartlar.map((kart) => (
                  <FocusableItem
                    key={kart.id}
                    style={styles.seritKarti}
                    focusedStyle={styles.sonIzlenenOdak}
                    onPress={() => uygulamaBaslat({ name: serit.appName, pkg: serit.pkg })}
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
                        </View>
                      </ImageBackground>
                    )}
                  </FocusableItem>
                ))}
              </ScrollView>
            </View>
          ))}

          {/* 5. '+ YENİ İÇERİK ŞERİDİ EKLE' BUTONU (En Altta) */}
          <View style={styles.seritEklemeAlani}>
            <FocusableItem
              style={styles.yeniSeritButon}
              focusedStyle={styles.yeniSeritOdak}
              onPress={() => setSeritEkleAcik(true)}
            >
              {() => (
                <View style={styles.yeniSeritIcerik}>
                  <Text style={styles.yeniSeritArti}>➕</Text>
                  <Text style={styles.yeniSeritYazi}>Yeni Uygulama İçerik Şeridi Ekle (Prime Video, Netflix vb.)</Text>
                </View>
              )}
            </FocusableItem>
          </View>
        </ScrollView>

        {/* ================= MODAL 1: UYGULAMA EKLE ================= */}
        <Modal visible={uygulamaEkleAcik} transparent animationType="fade">
          <View style={styles.modalArkaplan}>
            <View style={styles.modalPencere}>
              <View style={styles.modalBaslikSatir}>
                <Text style={styles.modalBaslik}>➕ Favori Uygulama Ekle</Text>
                <FocusableItem style={styles.modalKapatButon} onPress={() => setUygulamaEkleAcik(false)}>
                  {() => <Text style={styles.modalKapatYazi}>✕ Kapat</Text>}
                </FocusableItem>
              </View>

              <Text style={styles.modalAltBaslik}>Kendi uygulamanızı yazın veya aşağıdaki hazır listeden seçin:</Text>

              {/* Form Alanı */}
              <View style={styles.formSatir}>
                <TextInput
                  style={styles.modalGirdi}
                  placeholder="Uygulama Adı (Örn: Stremio, Tivimate)"
                  placeholderTextColor="#777"
                  value={yeniAppName}
                  onChangeText={setYeniAppName}
                />
                <TextInput
                  style={styles.modalGirdi}
                  placeholder="Paket Adı (İsteğe bağlı, örn: com.stremio.one)"
                  placeholderTextColor="#777"
                  value={yeniAppPkg}
                  onChangeText={setYeniAppPkg}
                />
              </View>

              {/* Renk Seçimi */}
              <Text style={styles.formEtiket}>Kart Rengi Seçin:</Text>
              <View style={styles.renkSecimSatir}>
                {['#3A1448', '#1B355A', '#5A1616', '#123D24', '#B45309', '#1E1E1E'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setYeniAppColor(c)}
                    style={[styles.renkKare, { backgroundColor: c }, yeniAppColor === c && styles.renkSecili]}
                  />
                ))}
              </View>

              {/* Hızlı Seçim Listesi */}
              <Text style={styles.formEtiket}>Veya Hazır TV Uygulamalarından Seçin:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {HAZIR_UYGULAMALAR.map((h) => (
                  <FocusableItem
                    key={h.name}
                    style={[styles.hazirAppKutu, { backgroundColor: h.color }]}
                    onPress={() => {
                      setYeniAppName(h.name);
                      setYeniAppPkg(h.pkg);
                      setYeniAppIcon(h.icon);
                      setYeniAppColor(h.color);
                    }}
                  >
                    {() => (
                      <>
                        <Text style={{ fontSize: 16 }}>{h.icon}</Text>
                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold', marginTop: 2 }}>{h.name}</Text>
                      </>
                    )}
                  </FocusableItem>
                ))}
              </ScrollView>

              <FocusableItem style={styles.kaydetButon} focusedStyle={styles.kaydetOdak} onPress={favoriEkle}>
                {() => <Text style={styles.kaydetYazi}>✔ Favorilere Kaydet</Text>}
              </FocusableItem>
            </View>
          </View>
        </Modal>

        {/* ================= MODAL 2: İZLEME EKLE ================= */}
        <Modal visible={izlemeEkleAcik} transparent animationType="fade">
          <View style={styles.modalArkaplan}>
            <View style={styles.modalPencereKucuk}>
              <View style={styles.modalBaslikSatir}>
                <Text style={styles.modalBaslik}>🕒 Son İzlenen Ekle</Text>
                <FocusableItem style={styles.modalKapatButon} onPress={() => setIzlemeEkleAcik(false)}>
                  {() => <Text style={styles.modalKapatYazi}>✕ Kapat</Text>}
                </FocusableItem>
              </View>

              <Text style={styles.modalAltBaslik}>İzlediğiniz film veya diziyi ekleyin:</Text>

              <TextInput
                style={styles.modalGirdiTam}
                placeholder="Film veya Dizi Adı"
                placeholderTextColor="#777"
                value={yeniFilmBaslik}
                onChangeText={setYeniFilmBaslik}
              />

              <TextInput
                style={styles.modalGirdiTam}
                placeholder="İzlenme Yüzdesi (Örn: 65)"
                placeholderTextColor="#777"
                keyboardType="numeric"
                value={yeniFilmYuzde}
                onChangeText={setYeniFilmYuzde}
              />

              <FocusableItem style={styles.kaydetButon} focusedStyle={styles.kaydetOdak} onPress={izlemeKaydiEkle}>
                {() => <Text style={styles.kaydetYazi}>✔ Listeme Ekle</Text>}
              </FocusableItem>
            </View>
          </View>
        </Modal>

        {/* ================= MODAL 3: İÇERİK ŞERİDİ EKLE (PRIME VIDEO, NETFLIX VB.) ================= */}
        <Modal visible={seritEkleAcik} transparent animationType="fade">
          <View style={styles.modalArkaplan}>
            <View style={styles.modalPencere}>
              <View style={styles.modalBaslikSatir}>
                <Text style={styles.modalBaslik}>📺 Uygulama İçerik Şeridi Ekle</Text>
                <FocusableItem style={styles.modalKapatButon} onPress={() => setSeritEkleAcik(false)}>
                  {() => <Text style={styles.modalKapatYazi}>✕ Kapat</Text>}
                </FocusableItem>
              </View>

              <Text style={styles.modalAltBaslik}>
                Ana sayfanızda reklam/öneri filmleri akacak sağlayıcıyı seçin:
              </Text>

              <View style={styles.seritSecimGrid}>
                {[
                  { name: 'Disney+', pkg: 'com.disney.disneyplus', color: '#113CCF' },
                  { name: 'YouTube Trendler', pkg: 'com.google.android.youtube.tv', color: '#E50914' },
                  { name: 'Kodi Sinema', pkg: 'org.xbmc.kodi', color: '#17B2E7' },
                  { name: 'BluTV Popüler', pkg: 'com.blutv', color: '#00A8E1' },
                  { name: 'Exxen Dizi', pkg: 'com.exxen.android', color: '#F59E0B' },
                  { name: 'TOD Spor', pkg: 'com.digiturk.tod', color: '#8B5CF6' },
                ].map((s) => (
                  <FocusableItem
                    key={s.name}
                    style={[styles.seritSecimKarti, { borderColor: s.color }]}
                    focusedStyle={styles.sonIzlenenOdak}
                    onPress={() => seritEkle(s.name, s.pkg, s.color)}
                  >
                    {() => (
                      <>
                        <View style={[styles.seritSecimDaire, { backgroundColor: s.color }]} />
                        <Text style={styles.seritSecimYazi}>{s.name}</Text>
                        <Text style={styles.seritSecimAlt}>+ Şerit Olarak Ekle</Text>
                      </>
                    )}
                  </FocusableItem>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        {/* ================= MODAL 4: SAĞ ÜST AYARLAR MENÜSÜ ================= */}
        <Modal visible={ayarlarAcik} transparent animationType="fade">
          <View style={styles.modalArkaplan}>
            <View style={styles.modalPencere}>
              <View style={styles.modalBaslikSatir}>
                <Text style={styles.modalBaslik}>⚙️ Mi Box & Başlatıcı Ayarları</Text>
                <FocusableItem style={styles.modalKapatButon} onPress={() => setAyarlarAcik(false)}>
                  {() => <Text style={styles.modalKapatYazi}>✕ Kapat</Text>}
                </FocusableItem>
              </View>

              <Text style={styles.modalAltBaslik}>Sistem ve başlatıcı tercihlerinizi buradan yönetin:</Text>

              <View style={{ marginTop: 8 }}>
                <FocusableItem
                  style={styles.ayarKartGenis}
                  focusedStyle={styles.sonIzlenenOdak}
                  onPress={varsayilanLauncherAyariniAc}
                >
                  {() => (
                    <View style={styles.ayarKartIcerik}>
                      <Text style={styles.ayarKartIkon}>⚡</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ayarKartBaslik}>Varsayılan Başlatıcı Olarak Ayarla</Text>
                        <Text style={styles.ayarKartAlt}>Mi Box kumandası Home tuşuna basınca bu arayüz açılsın</Text>
                      </View>
                      <Text style={styles.ayarOk}>›</Text>
                    </View>
                  )}
                </FocusableItem>

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
  camKatman: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 16, 0.42)',
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
  miLogoKare: {
    backgroundColor: '#FF6900',
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  miLogoYazi: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  miBoxBaslik: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 24,
    letterSpacing: 0.3,
  },
  aramaKapsul: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
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
    backgroundColor: 'rgba(124, 58, 237, 0.8)',
    borderColor: '#FFF',
    transform: [{ scale: 1.1 }],
  },
  ustAyarIkon: { fontSize: 18 },

  // ANA AKIŞ (TAM EKRAN)
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

  // UYGULAMA KARTLARI
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

  // İÇERİK ŞERİTLERİ (PRIME VIDEO, NETFLIX AKIŞLARI)
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

  // YENİ ŞERİT EKLE ALANI
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: '#FBE122',
    transform: [{ scale: 1.02 }],
  },
  yeniSeritIcerik: { flexDirection: 'row', alignItems: 'center' },
  yeniSeritArti: { fontSize: 14, marginRight: 8 },
  yeniSeritYazi: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 13, fontWeight: '600' },

  // MODALLAR
  modalArkaplan: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalPencere: {
    width: 600,
    backgroundColor: '#121422',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    padding: 20,
  },
  modalPencereKucuk: {
    width: 460,
    backgroundColor: '#121422',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    padding: 20,
  },
  modalBaslikSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalBaslik: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  modalKapatButon: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  modalKapatYazi: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  modalAltBaslik: { color: '#AAA', fontSize: 12, marginBottom: 12 },

  formSatir: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  modalGirdi: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    color: '#FFF',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
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
  formEtiket: { color: '#DDD', fontSize: 11, fontWeight: 'bold', marginTop: 6, marginBottom: 6 },
  renkSecimSatir: { flexDirection: 'row', marginBottom: 8 },
  renkKare: { width: 34, height: 34, borderRadius: 8, marginRight: 10 },
  renkSecili: { borderWidth: 2.5, borderColor: '#FFF' },

  hazirAppKutu: {
    width: 85,
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  kaydetButon: {
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  kaydetOdak: {
    backgroundColor: '#8B5CF6',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  kaydetYazi: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },

  // Şerit Seçim Grid
  seritSecimGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  seritSecimKarti: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
  },
  seritSecimDaire: { width: 10, height: 10, borderRadius: 5, marginBottom: 6 },
  seritSecimYazi: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  seritSecimAlt: { color: '#AAA', fontSize: 10, marginTop: 4 },

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
