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
} from 'react-native';

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

const GS_FAVORILER = [
  { id: '1', name: 'Nuvio', color: '#4A154B', text: '▶', pkg: 'com.nuvio', url: 'nuvio://' },
  { id: '2', name: 'Cloudstream', color: '#1E3A5F', text: '☁️', pkg: 'com.lagradost.cloudstream3', url: 'cloudstream://' },
  { id: '3', name: 'Kodi', color: '#183B56', text: '🔹', pkg: 'org.xbmc.kodi', url: 'org.xbmc.kodi://' },
  { id: '4', name: 'YouTube TV', color: '#731414', text: '▶ YT', pkg: 'com.google.android.youtube.tv', url: 'vnd.youtube://' },
  { id: '5', name: 'Netflix', color: '#1B1B1B', text: 'N', pkg: 'com.netflix.ninja', url: 'nflx://' },
  { id: '6', name: 'Disney+', color: '#092542', text: 'D+', pkg: 'com.disney.disneyplus', url: 'disneyplus://' },
];

const GS_ONIZLEMELER = [
  { id: '101', title: 'Galatasaray Maç Özeti', image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80' },
  { id: '102', title: 'The Last of Us', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80' },
  { id: '103', title: 'House of the Dragon', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80' },
];

const SOL_MENU = [
  { id: 'Ana Ekran', icon: '🏠' },
  { id: 'Uygulamalar', icon: '⊞' },
  { id: 'Filmler', icon: '🎬' },
  { id: 'Canlı TV', icon: '📡' },
  { id: 'Ayarlar', icon: '⚙️' },
];

export default function App() {
  const [aktifMenu, setAktifMenu] = useState('Ana Ekran');
  const [aramaMetni, setAramaMetni] = useState('');
  const [saat, setSaat] = useState('20:15');
  const [tarih, setTarih] = useState('');
  const [rehberGorunsun, setRehberGorunsun] = useState(true);

  useEffect(() => {
    const guncelle = () => {
      const simdi = new Date();
      setSaat(simdi.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      setTarih(simdi.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' }));
    };
    guncelle();
    const timer = setInterval(guncelle, 10000);
    return () => clearInterval(timer);
  }, []);

  // 1. Android Sistem Ayarları / Varsayılan Başlatıcı Ekranını Doğrudan Açma
  const varsayilanLauncherAyariniAc = async () => {
    try {
      if (Platform.OS === 'android') {
        // Android Home / Default Apps ayar sayfasını doğrudan tetikler
        await Linking.sendIntent('android.settings.HOME_SETTINGS');
      } else {
        Alert.alert('Bilgi', 'Bu özellik yalnızca Android TV cihazlarda çalışır.');
      }
    } catch {
      try {
        // Alternatif intent: Genel Sistem Ayarları
        await Linking.sendIntent('android.settings.SETTINGS');
      } catch {
        Alert.alert('Ayarlar', 'Cihaz ayarları ekranı açılamadı.');
      }
    }
  };

  // 2. Mi Box / Android TV'nin Orijinal / Standart Ana Ekranına Geri Dönüş
  const orijinalTemayaDon = async () => {
    Alert.alert(
      'Orijinal TV Arayüzü',
      'Mi Box orijinal ana ekranına dönmek istiyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Dön',
          onPress: async () => {
            const bilinenOrijinalLauncherlar = [
              'com.google.android.tvlauncher',       // Standart Android TV Launcher
              'com.google.android.apps.tv.launcherx', // Google TV Launcher
              'com.xiaomi.mitv.tvbox.launcher',       // Xiaomi PatchWall / MiTV Launcher
            ];

            let acildi = false;
            for (const pkg of bilinenOrijinalLauncherlar) {
              try {
                const url = `intent:#Intent;package=${pkg};action=android.intent.action.MAIN;category=android.intent.category.HOME;end`;
                const destekleniyor = await Linking.canOpenURL(url).catch(() => false);
                if (destekleniyor) {
                  await Linking.openURL(url);
                  acildi = true;
                  break;
                }
              } catch {
                // Sıradakini dene
              }
            }

            if (!acildi) {
              // Paket bulunamazsa sistem başlatıcı seçicisini aç
              varsayilanLauncherAyariniAc();
            }
          },
        },
      ]
    );
  };

  const uygulamaBaslat = async (app: (typeof GS_FAVORILER)[0]) => {
    try {
      const url =
        Platform.OS === 'android' && app.pkg
          ? `intent:#Intent;package=${app.pkg};action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end`
          : app.url;

      const destekleniyor = await Linking.canOpenURL(url).catch(() => false);
      if (destekleniyor) {
        await Linking.openURL(url);
      } else {
        const fallback = await Linking.canOpenURL(app.url).catch(() => false);
        if (fallback) {
          await Linking.openURL(app.url);
        } else {
          Alert.alert('GS Launcher', `"${app.name}" uygulaması cihazda bulunamadı veya henüz yüklü değil.`);
        }
      }
    } catch {
      Alert.alert('Hata', `${app.name} başlatılamadı.`);
    }
  };

  return (
    <View style={styles.arkaplan}>
      <StatusBar hidden={true} />
      <SafeAreaView style={styles.karartmaKatmani}>
        {/* ÜST BAR */}
        <View style={styles.ustBar}>
          <View style={styles.ustSol}>
            <View style={styles.gsLogoKutu}>
              <Text style={styles.gsLogoYazi}>GS</Text>
            </View>
            <Text style={styles.baslik}>GS LAUNCHER</Text>

            <View style={styles.aramaCubugu}>
              <TextInput
                style={styles.aramaGirdi}
                placeholder="🔍 Arama..."
                placeholderTextColor="#A0A0A0"
                value={aramaMetni}
                onChangeText={setAramaMetni}
              />
            </View>
          </View>

          <View style={styles.ustSag}>
            {/* Orijinal Arayüze Hızlı Dönüş Butonu */}
            <FocusableItem
              style={styles.hizliCikisButon}
              focusedStyle={styles.hizliCikisOdakli}
              onPress={orijinalTemayaDon}
            >
              {(isFocused) => (
                <Text style={[styles.hizliCikisMetin, isFocused && styles.metinSari]}>
                  ↩ Orijinal TV
                </Text>
              )}
            </FocusableItem>

            <View style={styles.saatKutu}>
              <Text style={styles.saatYazi}>{saat}</Text>
              <Text style={styles.altYazi}>{tarih}</Text>
            </View>
          </View>
        </View>

        {/* ANA GÖVDE */}
        <View style={styles.anaGovde}>
          {/* SOL MENÜ */}
          <View style={styles.solMenu}>
            {SOL_MENU.map((item, index) => {
              const secili = aktifMenu === item.id;
              return (
                <FocusableItem
                  key={item.id}
                  hasPreferredFocus={index === 0}
                  onPress={() => setAktifMenu(item.id)}
                  style={[styles.menuSatir, secili && styles.menuSatirSecili]}
                  focusedStyle={styles.menuSatirOdakli}
                >
                  {(isFocused) => (
                    <>
                      <Text style={[styles.menuIkon, isFocused && styles.metinSari]}>{item.icon}</Text>
                      <Text
                        style={[
                          styles.menuMetin,
                          secili && styles.menuMetinSecili,
                          isFocused && styles.metinSari,
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

          {/* SAĞ İÇERİK */}
          <ScrollView style={styles.sagIcerik} showsVerticalScrollIndicator={false}>
            {/* AYARLAR MENÜSÜ SEÇİLİYSE */}
            {aktifMenu === 'Ayarlar' ? (
              <View style={styles.ayarlarPaneli}>
                <Text style={styles.bolumBaslik}>⚙️ Launcher & Sistem Ayarları</Text>
                <Text style={styles.ayarAciklama}>
                  Buradan varsayılan başlatıcıyı tek tıkla değiştirebilir veya Mi Box'ın orijinal ekranına geri dönebilirsiniz:
                </Text>

                <View style={styles.ayarKartlariSatir}>
                  <FocusableItem
                    style={styles.ayarKarti}
                    focusedStyle={styles.kartOdakli}
                    onPress={varsayilanLauncherAyariniAc}
                  >
                    {() => (
                      <>
                        <Text style={styles.ayarKartiIkon}>⚡</Text>
                        <Text style={styles.ayarKartiBaslik}>Varsayılan Başlatıcı Yap</Text>
                        <Text style={styles.ayarKartiAlt}>Kumanda Home tuşuna basınca doğrudan GS Launcher açılsın</Text>
                      </>
                    )}
                  </FocusableItem>

                  <FocusableItem
                    style={styles.ayarKarti}
                    focusedStyle={styles.kartOdakli}
                    onPress={orijinalTemayaDon}
                  >
                    {() => (
                      <>
                        <Text style={styles.ayarKartiIkon}>🏠</Text>
                        <Text style={styles.ayarKartiBaslik}>Orijinal Ekrana Dön</Text>
                        <Text style={styles.ayarKartiAlt}>Mi Box standart ana menüsüne geri geçiş yap</Text>
                      </>
                    )}
                  </FocusableItem>

                  <FocusableItem
                    style={styles.ayarKarti}
                    focusedStyle={styles.kartOdakli}
                    onPress={() => Linking.sendIntent('android.settings.SETTINGS').catch(() => {})}
                  >
                    {() => (
                      <>
                        <Text style={styles.ayarKartiIkon}>📱</Text>
                        <Text style={styles.ayarKartiBaslik}>Cihaz Ayarları</Text>
                        <Text style={styles.ayarKartiAlt}>Wi-Fi, Bluetooth ve TV ses/görüntü ayarlarını aç</Text>
                      </>
                    )}
                  </FocusableItem>
                </View>
              </View>
            ) : (
              <>
                {/* İLK AÇILIŞ REHBER KARTI (HERKESİN KOLAYCA KURMASI İÇİN) */}
                {rehberGorunsun && (
                  <View style={styles.rehberKutu}>
                    <View style={styles.rehberMetinKutusu}>
                      <Text style={styles.rehberBaslik}>💡 Tek Tuşla Kurulum</Text>
                      <Text style={styles.rehberAciklama}>
                        Mi Box kumandanızdaki Ana Ekran tuşuna basıldığında doğrudan bu temanın açılması için aşağıdaki butona basın ve "Her Zaman" seçeneğini işaretleyin.
                      </Text>
                    </View>
                    <View style={styles.rehberButonlar}>
                      <FocusableItem
                        style={styles.rehberAyarButon}
                        focusedStyle={styles.kartOdakli}
                        onPress={varsayilanLauncherAyariniAc}
                      >
                        {() => <Text style={styles.rehberAyarButonYazi}>⚡ Varsayılan Yap</Text>}
                      </FocusableItem>
                      <FocusableItem
                        style={styles.rehberKapatButon}
                        focusedStyle={styles.kartOdakli}
                        onPress={() => setRehberGorunsun(false)}
                      >
                        {() => <Text style={styles.rehberKapatYazi}>Gizle</Text>}
                      </FocusableItem>
                    </View>
                  </View>
                )}

                <Text style={styles.bolumBaslik}>⭐ Favori Uygulamalar</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yatayListe}>
                  {GS_FAVORILER.map((app) => (
                    <FocusableItem
                      key={app.id}
                      style={[styles.uygulamaKarti, { backgroundColor: app.color }]}
                      focusedStyle={styles.kartOdakli}
                      onPress={() => uygulamaBaslat(app)}
                    >
                      {() => (
                        <>
                          <Text style={styles.uygulamaIkonYazi}>{app.text}</Text>
                          <Text style={styles.uygulamaIsim} numberOfLines={1}>
                            {app.name}
                          </Text>
                        </>
                      )}
                    </FocusableItem>
                  ))}
                </ScrollView>

                <Text style={styles.bolumBaslik}>🎬 Son İzlenenler</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yatayListe}>
                  {GS_ONIZLEMELER.map((film) => (
                    <FocusableItem
                      key={film.id}
                      style={styles.onizlemeKarti}
                      focusedStyle={styles.kartOdakli}
                      onPress={() => Alert.alert('Oynatıcı', `${film.title} seçildi.`)}
                    >
                      {() => (
                        <ImageBackground source={{ uri: film.image }} style={styles.onizlemeResim}>
                          <View style={styles.onizlemeAltKarartma}>
                            <Text style={styles.onizlemeBaslik} numberOfLines={1}>
                              {film.title}
                            </Text>
                          </View>
                        </ImageBackground>
                      )}
                    </FocusableItem>
                  ))}
                </ScrollView>
              </>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  arkaplan: { flex: 1, backgroundColor: '#0A0C16' },
  karartmaKatmani: { flex: 1, paddingHorizontal: 32, paddingTop: 16 },

  ustBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  ustSol: { flexDirection: 'row', alignItems: 'center' },
  gsLogoKutu: { backgroundColor: '#A2191F', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 12 },
  gsLogoYazi: { color: '#FBE122', fontWeight: 'bold', fontSize: 18 },
  baslik: { color: '#FFF', fontSize: 20, fontWeight: '800', letterSpacing: 1, marginRight: 24 },
  aramaCubugu: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    paddingHorizontal: 16,
    width: 260,
  },
  aramaGirdi: { color: '#FFF', fontSize: 13, paddingVertical: 6 },

  ustSag: { flexDirection: 'row', alignItems: 'center' },
  hizliCikisButon: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  hizliCikisOdakli: {
    backgroundColor: '#A2191F',
    borderColor: '#FBE122',
    transform: [{ scale: 1.05 }],
  },
  hizliCikisMetin: { color: '#EEE', fontSize: 12, fontWeight: 'bold' },

  saatKutu: { alignItems: 'flex-end' },
  saatYazi: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  altYazi: { color: '#BBB', fontSize: 12, marginTop: 2 },

  anaGovde: { flex: 1, flexDirection: 'row' },
  solMenu: {
    width: 170,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 10,
    marginRight: 24,
    justifyContent: 'space-evenly',
  },
  menuSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginVertical: 3,
  },
  menuSatirSecili: { backgroundColor: 'rgba(162, 25, 31, 0.4)' },
  menuSatirOdakli: {
    backgroundColor: '#A2191F',
    borderWidth: 2,
    borderColor: '#FBE122',
    transform: [{ scale: 1.05 }],
  },

  menuIkon: { fontSize: 16, marginRight: 10, color: '#DDD' },
  menuMetin: { color: '#AAA', fontSize: 14, fontWeight: '500' },
  menuMetinSecili: { color: '#FFF', fontWeight: 'bold' },
  metinSari: { color: '#FBE122', fontWeight: 'bold' },

  sagIcerik: { flex: 1 },
  bolumBaslik: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12, letterSpacing: 0.5 },
  yatayListe: { marginBottom: 20, overflow: 'visible' },

  // Kolay Kurulum Rehber Bannerı
  rehberKutu: {
    backgroundColor: 'rgba(162, 25, 31, 0.25)',
    borderWidth: 1.5,
    borderColor: '#FBE122',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rehberMetinKutusu: { flex: 1, marginRight: 16 },
  rehberBaslik: { color: '#FBE122', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  rehberAciklama: { color: '#DDD', fontSize: 12, lineHeight: 17 },
  rehberButonlar: { flexDirection: 'row', alignItems: 'center' },
  rehberAyarButon: {
    backgroundColor: '#A2191F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FBE122',
    marginRight: 8,
  },
  rehberAyarButonYazi: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  rehberKapatButon: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  rehberKapatYazi: { color: '#AAA', fontSize: 12 },

  // Ayarlar Paneli
  ayarlarPaneli: { paddingVertical: 10 },
  ayarAciklama: { color: '#AAA', fontSize: 13, marginBottom: 16 },
  ayarKartlariSatir: { flexDirection: 'row', justifyContent: 'space-between' },
  ayarKarti: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 18,
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ayarKartiIkon: { fontSize: 32, marginBottom: 10 },
  ayarKartiBaslik: { color: '#FFF', fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 },
  ayarKartiAlt: { color: '#888', fontSize: 11, textAlign: 'center', lineHeight: 15 },

  // Odaklanma stili
  defaultFocused: {
    transform: [{ scale: 1.08 }],
    borderColor: '#FBE122',
    borderWidth: 2.5,
    elevation: 8,
  },
  kartOdakli: {
    borderColor: '#FBE122',
    borderWidth: 3,
  },

  uygulamaKarti: {
    width: 130,
    height: 95,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  uygulamaIkonYazi: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 6 },
  uygulamaIsim: { color: '#EEE', fontSize: 12, fontWeight: '600' },

  onizlemeKarti: {
    width: 220,
    height: 125,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  onizlemeResim: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#1A1D2C' },
  onizlemeAltKarartma: { backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 8 },
  onizlemeBaslik: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
});
