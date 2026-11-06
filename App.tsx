import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ImageBackground,
  Image,
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
  style?: any;
  focusedStyle?: any;
  hasPreferredFocus?: boolean;
  children: ((isFocused: boolean) => React.ReactNode) | React.ReactNode;
}

const FocusableItem: React.FC<FocusableItemProps> = ({
  onPress,
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
      style={[
        style,
        isFocused && [styles.defaultFocused, focusedStyle],
      ]}
    >
      {typeof children === 'function' ? children(isFocused) : children}
    </TouchableOpacity>
  );
};

// Başlangıç Favori Uygulamaları (Görseldeki Gibi)
const INITIAL_FAVORILER = [
  { id: '1', name: 'Nuvio', color: '#3A1448', text: '▶', pkg: 'com.nuvio', url: 'nuvio://' },
  { id: '2', name: 'Cloudstream', color: '#1B355A', text: '☁️', pkg: 'com.lagradost.cloudstream3', url: 'cloudstream://' },
  { id: '3', name: 'Kodi', color: '#15324D', text: '🔹', pkg: 'org.xbmc.kodi', url: 'org.xbmc.kodi://' },
  { id: '4', name: 'YouTube', color: '#5A1616', text: '▶ YouTube', pkg: 'com.google.android.youtube.tv', url: 'vnd.youtube://' },
  { id: '5', name: 'NETFLIX', color: '#161616', text: 'NETFLIX', textColor: '#E50914', pkg: 'com.netflix.ninja', url: 'nflx://' },
  { id: '6', name: 'Disney+', color: '#0A2544', text: 'Disney+', pkg: 'com.disney.disneyplus', url: 'disneyplus://' },
  { id: '7', name: 'prime video', color: '#002B49', text: 'prime video', pkg: 'com.amazon.amazonvideo.livingroom', url: 'primevideo://' },
];

// Eklenebilir Diğer Popüler TV Uygulamaları Havuzu
const TUM_TV_UYGULAMALARI = [
  { id: '8', name: 'Stremio', color: '#3F2B68', text: '🍿 Stremio', pkg: 'com.stremio.one', url: 'stremio://' },
  { id: '9', name: 'TiviMate', color: '#1A3B44', text: '📡 TiviMate', pkg: 'ar.tvplayer.tv', url: 'tivimate://' },
  { id: '10', name: 'Spotify', color: '#123D24', text: '🎵 Spotify', pkg: 'com.spotify.tv.android', url: 'spotify://' },
  { id: '11', name: 'SmartTube', color: '#4A1818', text: '📺 SmartTube', pkg: 'com.teamsmart.videomanager.tv', url: 'smarttube://' },
  { id: '12', name: 'VLC Player', color: '#4A2800', text: '🟧 VLC', pkg: 'org.videolan.vlc', url: 'vlc://' },
  { id: '13', name: 'Exxen', color: '#423800', text: '🟡 Exxen', pkg: 'com.exxen.android', url: 'exxen://' },
  { id: '14', name: 'BluTV', color: '#002B44', text: '🔵 BluTV', pkg: 'com.blutv', url: 'blutv://' },
  { id: '15', name: 'Gain', color: '#2B2B2B', text: '⚪ Gain', pkg: 'com.gain.tv', url: 'gain://' },
  { id: '16', name: 'TOD TV', color: '#3B1A40', text: '🟣 TOD TV', pkg: 'com.digiturk.tod', url: 'tod://' },
  { id: '17', name: 'S Sport Plus', color: '#1A1A3A', text: '⚽ S Sport+', pkg: 'com.ssportplus.tv', url: 'ssport://' },
];

// Son İzlediklerim (Görseldekilerin Birebir Aynısı)
const INITIAL_SON_IZLENENLER = [
  { id: '101', title: 'Dune: Part Two', image: CARD_DUNE, progress: 65 },
  { id: '102', title: 'The Last of Us', image: CARD_TLOU, progress: 42 },
  { id: '103', title: 'House of the Dragon', image: CARD_HOTD, progress: 87 },
  { id: '104', title: 'Oppenheimer', image: CARD_OPP, progress: 30 },
];

// Sol Menü Sekmeleri
const SOL_MENU = [
  { id: 'Ana Ekran', icon: '🏠' },
  { id: 'Uygulamalar', icon: '⊞' },
  { id: 'Filmler', icon: '🎬' },
  { id: 'Diziler', icon: '📺' },
  { id: 'Canlı TV', icon: '📡' },
  { id: 'Favoriler', icon: '🤍' },
  { id: 'Ayarlar', icon: '⚙️' },
];

// Örnek Canlı TV Kanalları
const CANLI_KANALLAR = [
  { id: 'c1', name: 'TRT 1 HD', cat: 'Ulusal', color: '#901E1E' },
  { id: 'c2', name: 'ATV HD', cat: 'Ulusal', color: '#B04A00' },
  { id: 'c3', name: 'Show TV', cat: 'Ulusal', color: '#7E1C7E' },
  { id: 'c4', name: 'Kanal D', cat: 'Ulusal', color: '#1B4D7E' },
  { id: 'c5', name: 'TV8 HD', cat: 'Ulusal', color: '#8F1E1E' },
  { id: 'c6', name: 'NOW TV', cat: 'Ulusal', color: '#B51B35' },
  { id: 'c7', name: 'TRT Spor', cat: 'Spor', color: '#0E5C2F' },
  { id: 'c8', name: 'A Spor', cat: 'Spor', color: '#1E688F' },
  { id: 'c9', name: 'NTV', cat: 'Haber', color: '#821414' },
  { id: 'c10', name: 'CNN Türk', cat: 'Haber', color: '#8F1212' },
];

export default function App() {
  const [aktifMenu, setAktifMenu] = useState('Ana Ekran');
  const [favoriler, setFavoriler] = useState(INITIAL_FAVORILER);
  const [sonIzlenenler, setSonIzlenenler] = useState(INITIAL_SON_IZLENENLER);
  const [aramaMetni, setAramaMetni] = useState('');
  const [modalAcik, setModalAcik] = useState(false);

  // Canlı Saat & Tarih
  const [saat, setSaat] = useState('20:15');
  const [tarih, setTarih] = useState('6 Kasım Per');

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

  // Uygulamayı Başlat
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

  // Favoriye Ekleme / Çıkarma
  const favoriToggle = (item: (typeof TUM_TV_UYGULAMALARI)[0]) => {
    const zatenVar = favoriler.some((f) => f.id === item.id);
    if (zatenVar) {
      setFavoriler(favoriler.filter((f) => f.id !== item.id));
      Alert.alert('Favoriler', `"${item.name}" favorilerden çıkarıldı.`);
    } else {
      setFavoriler([...favoriler, item]);
      Alert.alert('Favoriler', `"${item.name}" ana ekrana eklendi! 🎉`);
    }
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
      {/* Transparan Cam Karartma Katmanı */}
      <SafeAreaView style={styles.camKatman}>
        {/* ================= ÜST BAR ================= */}
        <View style={styles.ustBar}>
          {/* Sol: Mi Box Logosu */}
          <View style={styles.ustSol}>
            <View style={styles.miLogoKare}>
              <Text style={styles.miLogoYazi}>mi</Text>
            </View>
            <Text style={styles.miBoxBaslik}>Mi Box</Text>

            {/* Arama Çubuğu */}
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

          {/* Sağ: İkonlar, Saat & Hava Durumu */}
          <View style={styles.ustSag}>
            <Text style={styles.durumIkon}>📶</Text>
            <Text style={styles.durumIkon}>ᛒ</Text>

            <View style={styles.saatTarihKutu}>
              <Text style={styles.saatYazi}>{saat}</Text>
              <Text style={styles.tarihYazi}>{tarih}</Text>
            </View>

            <View style={styles.havaKutu}>
              <Text style={styles.havaIkon}>⛅</Text>
              <View>
                <Text style={styles.havaDerece}>12°C</Text>
                <Text style={styles.havaSehir}>Kayseri</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ================= ANA GÖVDE ================= */}
        <View style={styles.anaGovde}>
          {/* SOL MENÜ (TRANSPARAN CAM KAPSÜL) */}
          <View style={styles.solMenuKapsul}>
            {SOL_MENU.map((item, index) => {
              const aktif = aktifMenu === item.id;
              return (
                <FocusableItem
                  key={item.id}
                  hasPreferredFocus={index === 0}
                  onPress={() => setAktifMenu(item.id)}
                  style={[styles.menuSatir, aktif && styles.menuSatirAktif]}
                  focusedStyle={styles.menuSatirOdak}
                >
                  {(isFocused) => (
                    <>
                      <Text style={[styles.menuIkon, (aktif || isFocused) && styles.menuMetinParlak]}>
                        {item.icon}
                      </Text>
                      <Text
                        style={[
                          styles.menuMetin,
                          aktif && styles.menuMetinAktif,
                          isFocused && styles.menuMetinParlak,
                        ]}
                      >
                        {item.id}
                      </Text>
                    </>
                  )}
                </FocusableItem>
              );
            })}
          </View>

          {/* SAĞ İÇERİK ALANI (MENÜYE GÖRE DİNAMİK DEĞİŞİR) */}
          <ScrollView style={styles.sagIcerik} showsVerticalScrollIndicator={false}>
            {/* ====== 1. ANA EKRAN ====== */}
            {aktifMenu === 'Ana Ekran' && (
              <>
                {/* DUNE PART TWO HERO BANNER */}
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

                        {/* Pagination Dots */}
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

                {/* FAVORİ UYGULAMALARIM BÖLÜMÜ */}
                <View style={styles.bolumBaslikSatir}>
                  <Text style={styles.bolumBaslik}>Favori Uygulamalarım</Text>
                  <FocusableItem onPress={() => setAktifMenu('Uygulamalar')} style={styles.tumunuGorButon}>
                    {() => <Text style={styles.tumunuGorYazi}>Tümünü Gör ›</Text>}
                  </FocusableItem>
                </View>

                {/* Yatay Favori Uygulama Kartları */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yatayListe}>
                  {favoriler.map((app) => (
                    <FocusableItem
                      key={app.id}
                      style={[styles.appKarti, { backgroundColor: app.color }]}
                      focusedStyle={styles.appKartiOdak}
                      onPress={() => uygulamaBaslat(app)}
                    >
                      {() => (
                        <View style={styles.appKartIcerik}>
                          <Text style={[styles.appIkonMetin, app.textColor ? { color: app.textColor } : {}]}>
                            {app.text}
                          </Text>
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
                    onPress={() => setModalAcik(true)}
                  >
                    {() => (
                      <View style={styles.artiIcerik}>
                        <Text style={styles.artiIkon}>+</Text>
                      </View>
                    )}
                  </FocusableItem>
                </ScrollView>

                {/* SON İZLEDİKLERİM BÖLÜMÜ */}
                <View style={styles.bolumBaslikSatir}>
                  <View style={styles.bolumBaslikIkonlu}>
                    <Text style={styles.saatGecmisIkon}>🕒</Text>
                    <Text style={styles.bolumBaslik}>Son İzlediklerim</Text>
                  </View>
                </View>

                {/* Yatay 4 Film / Dizi Kartı */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yatayListe}>
                  {sonIzlenenler.map((film) => (
                    <FocusableItem
                      key={film.id}
                      style={styles.sonIzlenenKarti}
                      focusedStyle={styles.sonIzlenenOdak}
                      onPress={() => Alert.alert('Oynatılıyor', `${film.title} devam ettiriliyor...`)}
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
                            {/* İlerleme Çubuğu */}
                            <View style={styles.ilerlemeZemin}>
                              <View style={[styles.ilerlemeDolu, { width: `${film.progress}%` }]} />
                            </View>
                          </View>
                        </ImageBackground>
                      )}
                    </FocusableItem>
                  ))}
                </ScrollView>
              </>
            )}

            {/* ====== 2. UYGULAMALAR MENÜSÜ ====== */}
            {aktifMenu === 'Uygulamalar' && (
              <View style={styles.doluMenuAlani}>
                <View style={styles.bolumBaslikSatir}>
                  <Text style={styles.bolumBaslik}>⊞ Yüklü ve Kullanılabilir TV Uygulamaları</Text>
                  <FocusableItem style={styles.hizliAksiyonButon} onPress={() => setModalAcik(true)}>
                    {() => <Text style={styles.hizliAksiyonYazi}>+ Yeni Ekle</Text>}
                  </FocusableItem>
                </View>
                <Text style={styles.menuAltAciklama}>
                  Aşağıdaki uygulamaları başlatabilir veya ana ekran favorilerinize ekleyip çıkarabilirsiniz:
                </Text>

                <View style={styles.gridKutusu}>
                  {[...favoriler, ...TUM_TV_UYGULAMALARI.filter((u) => !favoriler.some((f) => f.id === u.id))].map(
                    (app) => {
                      const favoride = favoriler.some((f) => f.id === app.id);
                      return (
                        <FocusableItem
                          key={app.id}
                          style={[styles.gridAppKarti, { backgroundColor: app.color }]}
                          focusedStyle={styles.appKartiOdak}
                          onPress={() => uygulamaBaslat(app)}
                        >
                          {() => (
                            <>
                              <Text style={styles.gridAppMetin}>{app.text}</Text>
                              <Text style={styles.gridAppIsim}>{app.name}</Text>
                              <TouchableOpacity
                                style={[styles.favoriRozet, favoride ? styles.rozetCikar : styles.rozetEkle]}
                                onPress={() => favoriToggle(app as any)}
                              >
                                <Text style={styles.rozetYazi}>{favoride ? '★ Favori' : '+ Ekle'}</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </FocusableItem>
                      );
                    }
                  )}
                </View>
              </View>
            )}

            {/* ====== 3. FİLMLER MENÜSÜ ====== */}
            {aktifMenu === 'Filmler' && (
              <View style={styles.doluMenuAlani}>
                <Text style={styles.bolumBaslik}>🎬 Popüler Filmler</Text>
                <View style={styles.gridKutusu}>
                  {[
                    { id: 'f1', title: 'Dune: Part Two', image: CARD_DUNE, puan: '8.6' },
                    { id: 'f2', title: 'Oppenheimer', image: CARD_OPP, puan: '8.9' },
                    { id: 'f3', title: 'Interstellar', image: CARD_TLOU, puan: '8.7' },
                    { id: 'f4', title: 'The Batman', image: CARD_HOTD, puan: '7.8' },
                  ].map((film) => (
                    <FocusableItem
                      key={film.id}
                      style={styles.filmGridKarti}
                      focusedStyle={styles.sonIzlenenOdak}
                      onPress={() => Alert.alert('Film', `${film.title} oynatılıyor...`)}
                    >
                      {() => (
                        <ImageBackground source={film.image} style={styles.filmResim} imageStyle={{ borderRadius: 14 }}>
                          <View style={styles.filmPuanRozet}>
                            <Text style={styles.filmPuanYazi}>★ {film.puan}</Text>
                          </View>
                          <View style={styles.filmAltBilgi}>
                            <Text style={styles.filmBaslikYazi}>{film.title}</Text>
                          </View>
                        </ImageBackground>
                      )}
                    </FocusableItem>
                  ))}
                </View>
              </View>
            )}

            {/* ====== 4. DİZİLER MENÜSÜ ====== */}
            {aktifMenu === 'Diziler' && (
              <View style={styles.doluMenuAlani}>
                <Text style={styles.bolumBaslik}>📺 Popüler TV Dizileri</Text>
                <View style={styles.gridKutusu}>
                  {[
                    { id: 'd1', title: 'The Last of Us', image: CARD_TLOU, sezon: '2. Sezon' },
                    { id: 'd2', title: 'House of the Dragon', image: CARD_HOTD, sezon: '2. Sezon' },
                    { id: 'd3', title: 'Breaking Bad', image: CARD_OPP, sezon: '5 Sezon' },
                    { id: 'd4', title: 'Stranger Things', image: CARD_DUNE, sezon: '4 Sezon' },
                  ].map((dizi) => (
                    <FocusableItem
                      key={dizi.id}
                      style={styles.filmGridKarti}
                      focusedStyle={styles.sonIzlenenOdak}
                      onPress={() => Alert.alert('Dizi', `${dizi.title} açılıyor...`)}
                    >
                      {() => (
                        <ImageBackground source={dizi.image} style={styles.filmResim} imageStyle={{ borderRadius: 14 }}>
                          <View style={styles.filmPuanRozet}>
                            <Text style={styles.filmPuanYazi}>{dizi.sezon}</Text>
                          </View>
                          <View style={styles.filmAltBilgi}>
                            <Text style={styles.filmBaslikYazi}>{dizi.title}</Text>
                          </View>
                        </ImageBackground>
                      )}
                    </FocusableItem>
                  ))}
                </View>
              </View>
            )}

            {/* ====== 5. CANLI TV MENÜSÜ ====== */}
            {aktifMenu === 'Canlı TV' && (
              <View style={styles.doluMenuAlani}>
                <Text style={styles.bolumBaslik}>📡 Canlı TV Kanalları</Text>
                <View style={styles.gridKutusu}>
                  {CANLI_KANALLAR.map((kanal) => (
                    <FocusableItem
                      key={kanal.id}
                      style={[styles.kanalKarti, { backgroundColor: kanal.color }]}
                      focusedStyle={styles.appKartiOdak}
                      onPress={() => Alert.alert('Canlı TV', `${kanal.name} yayını başlatılıyor...`)}
                    >
                      {() => (
                        <>
                          <Text style={styles.kanalKategori}>{kanal.cat}</Text>
                          <Text style={styles.kanalIsim}>{kanal.name}</Text>
                          <Text style={styles.canliYayindaRozet}>● CANLI</Text>
                        </>
                      )}
                    </FocusableItem>
                  ))}
                </View>
              </View>
            )}

            {/* ====== 6. FAVORİLER MENÜSÜ ====== */}
            {aktifMenu === 'Favoriler' && (
              <View style={styles.doluMenuAlani}>
                <Text style={styles.bolumBaslik}>🤍 Favorileriniz</Text>
                <Text style={styles.menuAltAciklama}>Seçtiğiniz favori uygulamalar:</Text>
                <View style={styles.gridKutusu}>
                  {favoriler.map((app) => (
                    <FocusableItem
                      key={app.id}
                      style={[styles.gridAppKarti, { backgroundColor: app.color }]}
                      focusedStyle={styles.appKartiOdak}
                      onPress={() => uygulamaBaslat(app)}
                    >
                      {() => (
                        <>
                          <Text style={styles.gridAppMetin}>{app.text}</Text>
                          <Text style={styles.gridAppIsim}>{app.name}</Text>
                        </>
                      )}
                    </FocusableItem>
                  ))}
                </View>
              </View>
            )}

            {/* ====== 7. AYARLAR MENÜSÜ ====== */}
            {aktifMenu === 'Ayarlar' && (
              <View style={styles.doluMenuAlani}>
                <Text style={styles.bolumBaslik}>⚙️ Mi Box & Başlatıcı Ayarları</Text>
                <Text style={styles.menuAltAciklama}>
                  Varsayılan ana ekranı değiştirebilir veya eski arayüze dönebilirsiniz:
                </Text>

                <View style={styles.ayarSatirKutusu}>
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
                          <Text style={styles.ayarKartAlt}>Kumanda Home tuşuna basınca her zaman bu ekran açılsın</Text>
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
                          <Text style={styles.ayarKartBaslik}>Orijinal Mi Box Arayüzüne Dön</Text>
                          <Text style={styles.ayarKartAlt}>Fabrika standart Google TV / Xiaomi ana ekranına geçiş yap</Text>
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
                          <Text style={styles.ayarKartAlt}>Wi-Fi, Bluetooth, Ses, Ekran ve Sistem ayarları</Text>
                        </View>
                        <Text style={styles.ayarOk}>›</Text>
                      </View>
                    )}
                  </FocusableItem>
                </View>
              </View>
            )}
          </ScrollView>
        </View>

        {/* ================= FAVORİ UYGULAMA EKLEME MODALI ================= */}
        <Modal visible={modalAcik} transparent animationType="fade">
          <View style={styles.modalArkaplan}>
            <View style={styles.modalPencere}>
              <View style={styles.modalBaslikSatir}>
                <Text style={styles.modalBaslik}>➕ Favori Uygulama Ekle / Yönet</Text>
                <FocusableItem style={styles.modalKapatButon} onPress={() => setModalAcik(false)}>
                  {() => <Text style={styles.modalKapatYazi}>✕ Kapat</Text>}
                </FocusableItem>
              </View>
              <Text style={styles.modalAltBaslik}>
                Ana ekrana eklemek veya çıkarmak istediğiniz uygulamanın üzerine tıklayın:
              </Text>

              <ScrollView style={{ maxHeight: 340 }}>
                <View style={styles.gridKutusu}>
                  {TUM_TV_UYGULAMALARI.map((app) => {
                    const secili = favoriler.some((f) => f.id === app.id);
                    return (
                      <FocusableItem
                        key={app.id}
                        style={[styles.modalAppKarti, { backgroundColor: app.color }, secili && styles.modalAppSecili]}
                        focusedStyle={styles.appKartiOdak}
                        onPress={() => favoriToggle(app)}
                      >
                        {() => (
                          <>
                            <Text style={styles.gridAppMetin}>{app.text}</Text>
                            <Text style={styles.gridAppIsim}>{app.name}</Text>
                            <Text style={[styles.durumMetin, secili ? styles.metinYesil : styles.metinGri]}>
                              {secili ? '✔ Eklendi' : '+ Ekle'}
                            </Text>
                          </>
                        )}
                      </FocusableItem>
                    );
                  })}
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
  // Görseldeki gibi transparan cam hissiyatı
  camKatman: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 16, 0.42)',
    paddingHorizontal: 28,
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

  // Arama Kapsülü
  aramaKapsul: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    paddingHorizontal: 16,
    width: 290,
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
  havaKutu: { flexDirection: 'row', alignItems: 'center' },
  havaIkon: { fontSize: 20, marginRight: 6 },
  havaDerece: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  havaSehir: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 9 },

  // ANA GÖVDE
  anaGovde: { flex: 1, flexDirection: 'row' },

  // SOL MENÜ (TRANSPARAN CAM KAPSÜL)
  solMenuKapsul: {
    width: 145,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginRight: 20,
    justifyContent: 'space-between',
  },
  menuSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginVertical: 2,
  },
  menuSatirAktif: {
    backgroundColor: 'rgba(124, 58, 237, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.8)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  menuSatirOdak: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 2,
    borderColor: '#FFF',
    transform: [{ scale: 1.05 }],
  },
  menuIkon: { fontSize: 15, marginRight: 9, color: 'rgba(255, 255, 255, 0.75)' },
  menuMetin: { color: 'rgba(255, 255, 255, 0.75)', fontSize: 12, fontWeight: '500' },
  menuMetinAktif: { color: '#FFF', fontWeight: '700' },
  menuMetinParlak: { color: '#FFF', fontWeight: '700' },

  // SAĞ İÇERİK
  sagIcerik: { flex: 1 },

  // HERO DUNE BANNER
  heroKapsayici: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 16,
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
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSagOk: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  okYazi: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  heroIcerik: { position: 'absolute', bottom: 14, left: 100, flexDirection: 'row', alignItems: 'center' },
  simdiIzleButon: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginRight: 14,
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
  oynatUcgen: { fontSize: 10, color: '#000', marginRight: 6 },
  simdiIzleYazi: { color: '#000', fontSize: 12, fontWeight: '700' },
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
  },
  bolumBaslikIkonlu: { flexDirection: 'row', alignItems: 'center' },
  saatGecmisIkon: { fontSize: 13, color: '#FFF', marginRight: 6 },
  bolumBaslik: { color: '#FFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  tumunuGorButon: { padding: 4 },
  tumunuGorYazi: { color: 'rgba(255, 255, 255, 0.65)', fontSize: 11 },

  yatayListe: { marginBottom: 16, overflow: 'visible' },

  // FAVORİ UYGULAMA KARTLARI (CAM EFEKTİ & GLOW)
  appKarti: {
    width: 95,
    height: 64,
    borderRadius: 14,
    marginRight: 10,
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
  appIkonMetin: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginBottom: 3 },
  appIsim: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 10, fontWeight: '500' },

  // '+' EKLE KARTI
  artiKarti: {
    width: 60,
    height: 64,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  artiKartiOdak: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: '#FBE122',
    transform: [{ scale: 1.1 }],
  },
  artiIcerik: { justifyContent: 'center', alignItems: 'center' },
  artiIkon: { color: '#FFF', fontSize: 24, fontWeight: '300' },

  // SON İZLEDİKLERİM KARTLARI
  sonIzlenenKarti: {
    width: 175,
    height: 98,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 12,
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
  sonIzlenenBaslik: { color: '#FFF', fontSize: 10, fontWeight: '700', flex: 1 },
  sonIzlenenYuzde: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 9, fontWeight: '600' },
  ilerlemeZemin: { height: 3, backgroundColor: 'rgba(255, 255, 255, 0.25)', borderRadius: 2 },
  ilerlemeDolu: { height: 3, backgroundColor: '#FFF', borderRadius: 2 },

  // DİĞER MENÜLER (Uygulamalar, Filmler, Canlı TV vb.)
  doluMenuAlani: { paddingVertical: 4 },
  menuAltAciklama: { color: 'rgba(255, 255, 255, 0.65)', fontSize: 12, marginBottom: 14 },
  hizliAksiyonButon: {
    backgroundColor: 'rgba(124, 58, 237, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  hizliAksiyonYazi: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  gridKutusu: { flexDirection: 'row', flexWrap: 'wrap' },

  // Uygulama Grid
  gridAppKarti: {
    width: 125,
    height: 85,
    borderRadius: 14,
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  gridAppMetin: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  gridAppIsim: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 11, fontWeight: '500', marginBottom: 4 },
  favoriRozet: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  rozetEkle: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  rozetCikar: { backgroundColor: 'rgba(245, 158, 11, 0.8)' },
  rozetYazi: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },

  // Film / Dizi Grid
  filmGridKarti: {
    width: 190,
    height: 110,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filmResim: { flex: 1, justifyContent: 'space-between' },
  filmPuanRozet: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    margin: 6,
  },
  filmPuanYazi: { color: '#FBE122', fontSize: 10, fontWeight: 'bold' },
  filmAltBilgi: { backgroundColor: 'rgba(0,0,0,0.7)', padding: 6 },
  filmBaslikYazi: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },

  // Canlı TV Kartları
  kanalKarti: {
    width: 135,
    height: 80,
    borderRadius: 14,
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  kanalKategori: { color: 'rgba(255, 255, 255, 0.65)', fontSize: 9, marginBottom: 2 },
  kanalIsim: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  canliYayindaRozet: { color: '#EF4444', fontSize: 9, fontWeight: 'bold' },

  // Ayarlar Satırları
  ayarSatirKutusu: { marginTop: 4 },
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

  // MODAL
  modalArkaplan: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalPencere: {
    width: 580,
    backgroundColor: '#121422',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    padding: 18,
  },
  modalBaslikSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalBaslik: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  modalKapatButon: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  modalKapatYazi: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  modalAltBaslik: { color: '#AAA', fontSize: 12, marginBottom: 14 },
  modalAppKarti: {
    width: 120,
    height: 80,
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 6,
  },
  modalAppSecili: { borderColor: '#10B981', borderWidth: 2 },
  durumMetin: { fontSize: 9, fontWeight: 'bold', marginTop: 3 },
  metinYesil: { color: '#10B981' },
  metinGri: { color: 'rgba(255, 255, 255, 0.5)' },

  // Varsayılan Odaklanma Efekti (TV D-Pad)
  defaultFocused: {
    transform: [{ scale: 1.08 }],
    borderColor: '#FFF',
    borderWidth: 2,
    elevation: 8,
  },
});
