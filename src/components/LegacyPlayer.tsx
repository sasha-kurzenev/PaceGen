import React, { useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accelerometer } from 'expo-sensors';
import { useKeepAwake } from 'expo-keep-awake';
import { audioHtml, genreProfiles, voiceNames, isMusicSnapshot, parsePresets, type GenreId, type SavedPreset } from '../audioEngine';
import { CadenceDetector } from '../cadence';

function KeepAwake() { useKeepAwake(); return null; }
export default function LegacyPlayer() { return <Player />; }
function Player() {
  const engine = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [melodyNumber, setMelodyNumber] = useState(1);
  const [melodyPending, setMelodyPending] = useState(false);
  const [instrument, setInstrument] = useState('Мягкий синт');
  const [pending, setPending] = useState(false);
  const [bpm, setBpm] = useState(160);
  const [tempoLoaded, setTempoLoaded] = useState(false);
  const lastStoredTempo = useRef(160);
  const tempoWriteQueue = useRef(Promise.resolve());
  const [volume, setVolume] = useState(0.55);
  const [auto, setAuto] = useState(false);
  const [cadence, setCadence] = useState<number | null>(null);
  const [genres, setGenres] = useState(false);
  const [genre, setGenre] = useState<GenreId>('electronic');
  const lastStoredGenre = useRef<GenreId>('electronic');
  const genreWriteQueue = useRef(Promise.resolve());
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const presetsRef = useRef<SavedPreset[]>([]);
  const presetBusyRef = useRef(false);
  const [presetBusy, setPresetBusy] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [presetNotice, setPresetNotice] = useState('');
  const snapshotTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState('');
  const [foreground, setForeground] = useState(true);
  const send = (command: object) => engine.current?.injectJavaScript(`window.control(${JSON.stringify(command)});true;`);
  const finishPresetAction = () => { presetBusyRef.current = false; setPresetBusy(false); };
  async function saveSnapshot(value: unknown) {
    if (!presetBusyRef.current || snapshotTimeout.current === null) return;
    clearTimeout(snapshotTimeout.current); snapshotTimeout.current = null;
    try {
      if (!isMusicSnapshot(value)) throw new Error('Invalid snapshot');
      if (presetsRef.current.length >= 10) { setPresetNotice('Все 10 мест заняты. Удалите один пресет.'); return; }
      const preset: SavedPreset = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, snapshot: value };
      const updated = [...presetsRef.current, preset];
      await AsyncStorage.setItem('pacegen.presets.v1', JSON.stringify(updated));
      presetsRef.current = updated; setPresets(updated);
      setPresetNotice('♥ Мелодия сохранена на телефоне');
    } catch { setError('Не удалось сохранить мелодию. Попробуйте ещё раз.'); }
    finally { finishPresetAction(); }
  }
  function likeMelody() {
    if (presetBusyRef.current) return;
    if (presetsRef.current.length >= 10) { setPresetNotice('Все 10 мест заняты. Удалите один пресет.'); return; }
    presetBusyRef.current = true; setPresetBusy(true); setPresetNotice('Сохраняем мелодию…');
    snapshotTimeout.current = setTimeout(() => {
      snapshotTimeout.current = null; finishPresetAction(); setPresetNotice('Не удалось получить мелодию. Нажмите сердечко ещё раз.');
    }, 5000);
    send({ type: 'snapshot' });
  }
  async function deletePreset(id: string) {
    if (presetBusyRef.current) return;
    presetBusyRef.current = true; setPresetBusy(true);
    try {
      const updated = presetsRef.current.filter(p => p.id !== id);
      await AsyncStorage.setItem('pacegen.presets.v1', JSON.stringify(updated));
      presetsRef.current = updated; setPresets(updated);
      if (selectedPreset === id) setSelectedPreset(null);
      setPresetNotice('Пресет удалён');
    } catch { setError('Не удалось удалить пресет. Попробуйте ещё раз.'); }
    finally { finishPresetAction(); }
  }
  function playPreset(preset: SavedPreset) {
    setAuto(false); setCadence(null); setBpm(preset.snapshot.bpm); setGenre(preset.snapshot.genre); setVolume(preset.snapshot.volume);
    setError(''); setPresetNotice('Играет сохранённая мелодия · повтор до смены паттерна');
    setPending(true); send({ type: 'loadPreset', id: preset.id, snapshot: preset.snapshot });
  }

  useEffect(() => {
    let cancelled = false;
    async function restoreTempo() {
      try {
        const [stored, storedGenre, storedPresets] = await Promise.all([
          AsyncStorage.getItem('pacegen.tempo.v1'),
          AsyncStorage.getItem('pacegen.genre.v1'),
          AsyncStorage.getItem('pacegen.presets.v1'),
        ]);
        if (cancelled) return;
        const value = stored === null ? 160 : Number(stored);
        const restored = Number.isInteger(value) && value >= 80 && value <= 200 ? value : 160;
        lastStoredTempo.current = restored;
        setBpm(restored);
        const restoredGenre = storedGenre && Object.prototype.hasOwnProperty.call(genreProfiles, storedGenre) ? storedGenre as GenreId : 'electronic';
        lastStoredGenre.current = restoredGenre;
        setGenre(restoredGenre);
        try {
          const restoredPresets = parsePresets(storedPresets);
          presetsRef.current = restoredPresets; setPresets(restoredPresets);
        } catch { setError('Не удалось прочитать список пресетов.'); }
      } catch {
        if (!cancelled) setError('Не удалось прочитать настройки. Выберите темп и жанр вручную.');
      } finally {
        if (!cancelled) setTempoLoaded(true);
      }
    }
    void restoreTempo();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => () => { if (snapshotTimeout.current) clearTimeout(snapshotTimeout.current); }, []);
  useEffect(() => {
    if (!tempoLoaded || lastStoredTempo.current === bpm) return;
    lastStoredTempo.current = bpm;
    // Serialize writes so an older slider/sensor value cannot overwrite a newer one.
    tempoWriteQueue.current = tempoWriteQueue.current
      .then(() => AsyncStorage.setItem('pacegen.tempo.v1', String(bpm)))
      .catch(() => { setError('Не удалось сохранить темп на телефоне.'); });
  }, [bpm, tempoLoaded]);
  useEffect(() => { if (ready && tempoLoaded) send({ type: 'settings', bpm, volume }); }, [ready, tempoLoaded, bpm, volume]);
  useEffect(() => {
    if (!tempoLoaded) return;
    if (ready) send({ type: 'genre', genre });
    if (lastStoredGenre.current === genre) return;
    lastStoredGenre.current = genre;
    genreWriteQueue.current = genreWriteQueue.current
      .then(() => AsyncStorage.setItem('pacegen.genre.v1', genre))
      .catch(() => { setError('Не удалось сохранить жанр на телефоне.'); });
  }, [genre, ready, tempoLoaded]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setForeground(state === 'active');
      setCadence(null);
      if (state !== 'active') { send({ type: 'stop' }); setPlaying(false); setPending(false); }
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!auto || !foreground) return;
    let cancelled = false;
    let subscription: ReturnType<typeof Accelerometer.addListener> | undefined;
    let lastEstimate = 0;
    const detector = new CadenceDetector();
    const watchdog = setInterval(() => { if (Date.now() - lastEstimate > 2500) setCadence(null); }, 500);
    async function listen() {
      try {
        if (!(await Accelerometer.isAvailableAsync())) throw new Error('Датчик движения недоступен. Используйте ручной темп.');
        const permission = await Accelerometer.requestPermissionsAsync();
        if (!permission.granted) throw new Error('Нет доступа к датчику. Используйте ручной темп.');
        if (cancelled) return;
        Accelerometer.setUpdateInterval(20);
        subscription = Accelerometer.addListener(({ x, y, z }) => {
          const now = Date.now();
          const estimate = detector.sample(x, y, z, now);
          if (estimate === null) return;
          lastEstimate = now;
          setCadence(estimate);
          setBpm(previous => Math.round(previous + Math.max(-2, Math.min(2, Math.max(80, Math.min(200, estimate)) - previous))));
        });
      } catch (e) {
        if (!cancelled) { setError(e instanceof Error ? e.message : 'Ошибка датчика движения'); setAuto(false); }
      }
    }
    void listen();
    return () => { cancelled = true; subscription?.remove(); clearInterval(watchdog); };
  }, [auto, foreground]);
  useEffect(() => {
    if (!pending) return;
    const timeout = setTimeout(() => { send({ type: 'stop' }); setPending(false); setPlaying(false); setError('Звук не ответил. Попробуйте ещё раз.'); }, 5000);
    return () => clearTimeout(timeout);
  }, [pending]);

  if (!tempoLoaded) return <SafeAreaView style={s.page}><Text style={[s.playerStatus, { padding: 24 }]}>Восстанавливаем настройки…</Text></SafeAreaView>;

  return <SafeAreaView style={s.page}>
    <StatusBar barStyle="light-content" />
    {playing && foreground && <KeepAwake />}
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.row}><Text style={s.brand}>pace<Text style={{ color: '#BDFA68' }}>gen</Text></Text><Text style={s.tag}>RUN WITH THE RHYTHM</Text></View>
      <Text style={s.title}>Твой бег.{'\n'}Твой ритм.</Text>
      <Text style={s.subtitle}>Музыка, которая движется вместе с тобой.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Выбрать жанр" style={s.genre} onPress={() => setGenres(true)}>
        <View style={s.row}><Text style={s.label}>ЖАНР</Text><Text style={s.green}>Изменить ›</Text></View>
        <Text style={s.genreTitle}>{genreProfiles[genre].name}</Text>
        <Text style={s.muted}>{genreProfiles[genre].description}</Text>
        <View style={s.wave}>{Array.from({ length: 35 }, (_, i) => <View key={i} style={{ width: 4, borderRadius: 3, height: 8 + ((i * 17 + 7) % 31), backgroundColor: playing ? '#BDFA68' : '#4C6340' }} />)}</View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Открыть мелодичный рок" style={s.rockLink} onPress={() => {
        send({ type: 'stop' }); setPlaying(false); setPending(false); router.push('/rock');
      }}>
        <Text style={s.rockLinkTitle}>Мелодичный рок ›</Text>
        <Text style={s.muted}>Новый генератор · гитара, бас и ударные</Text>
      </Pressable>
      <View style={s.player}>
        <View style={s.controls}>
          <Pressable accessibilityRole="button" accessibilityLabel="Сохранить мелодию в избранное" disabled={!ready || melodyPending || pending || presetBusy} style={[s.likeButton, (!ready || melodyPending || pending || presetBusy) && { opacity: 0.5 }]} onPress={likeMelody}>
            <Text style={s.heartIcon}>♡</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={playing ? 'Остановить музыку' : 'Включить музыку'} disabled={!ready || pending} style={[s.play, s.controlButton, (!ready || pending) && { opacity: 0.5 }]} onPress={() => { setError(''); setPending(true); send({ type: playing ? 'stop' : 'start' }); }}>
            <Text style={s.playerIcon}>{!ready || pending ? '…' : playing ? '■' : '▶'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Сменить мелодию и инструмент" disabled={!ready || melodyPending} style={[s.nextButton, s.controlButton, (!ready || melodyPending) && { opacity: 0.5 }]} onPress={() => send({ type: 'melody' })}>
            <View accessible={false} style={s.nextIcon}><Text style={s.nextTriangle}>▶</Text><View style={s.nextBar} /></View>
          </Pressable>
        </View>
        <Text style={s.playerStatus}>{!ready ? 'Подготовка звука…' : melodyPending ? 'Новая мелодия со следующего такта…' : `Фраза ${melodyNumber} · ${instrument}`}</Text>
      </View>
      <View style={s.segment}>{([{ label: 'Вручную', value: false }, { label: 'Под шаги', value: true }]).map(({ label, value }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: auto === value }} key={label} style={[s.segmentButton, auto === value && s.selected]} onPress={() => { setAuto(value); setCadence(null); setError(''); }}><Text style={[s.segmentText, auto === value && { color: '#10170C' }]}>{label}</Text></Pressable>)}</View>
      <View style={s.tempo}>
        <Text style={s.label}>{auto ? 'ТЕМП ПОД ШАГИ' : 'ТЕМП МУЗЫКИ'}</Text>
        <View style={[s.row, { justifyContent: 'center', gap: 25 }]}>
          <Pressable disabled={auto} accessibilityRole="button" accessibilityLabel="Уменьшить темп" style={[s.adjust, auto && { opacity: 0.25 }]} onPress={() => setBpm(Math.max(80, bpm - 1))}><Text style={s.adjustText}>−</Text></Pressable>
          <Text style={s.bpm}>{bpm}</Text>
          <Pressable disabled={auto} accessibilityRole="button" accessibilityLabel="Увеличить темп" style={[s.adjust, auto && { opacity: 0.25 }]} onPress={() => setBpm(Math.min(200, bpm + 1))}><Text style={s.adjustText}>+</Text></Pressable>
        </View>
        <Text style={s.unit}>BPM · ударов в минуту</Text>
        {!auto ? <><Slider accessibilityLabel="Темп музыки" minimumValue={80} maximumValue={200} step={1} value={bpm} onValueChange={setBpm} minimumTrackTintColor="#BDFA68" maximumTrackTintColor="#303A43" thumbTintColor="#BDFA68" /><View style={s.row}><Text style={s.muted}>80 · спокойно</Text><Text style={s.muted}>200 · интенсивно</Text></View></> : <Text style={s.autoHint}>{cadence ? `${cadence} шагов/мин · плавная подстройка` : 'Ищем ровный ритм шагов…\nПока сохраняем текущий темп.'}</Text>}
      </View>
      {auto && <Text style={s.note}>Экспериментальный режим: закрепите телефон в кармане или на поясе и двигайтесь равномерно. Первое измерение займёт несколько секунд.</Text>}
      <View style={s.volume}><Text style={s.label}>ГРОМКОСТЬ</Text><Slider accessibilityLabel="Громкость" style={{ flex: 1 }} minimumValue={0} maximumValue={1} value={volume} onValueChange={setVolume} minimumTrackTintColor="#BDFA68" maximumTrackTintColor="#303A43" thumbTintColor="#BDFA68" /><Text style={s.muted}>{Math.round(volume * 100)}%</Text></View>
      <View style={s.presetList}>
        <View style={s.row}><Text style={s.label}>ИЗБРАННОЕ</Text><Text style={s.muted}>{presets.length} / 10</Text></View>
        <Text style={s.note}>Сердечко сохраняет мелодию, жанр, темп, тембр и громкость. Нажмите пресет, чтобы воспроизвести его.</Text>
        {!!presetNotice && <Text accessibilityLiveRegion="polite" style={s.green}>{presetNotice}</Text>}
        {Array.from({ length: 10 }, (_, index) => {
          const preset = presets[index];
          return preset ? <View key={preset.id} style={[s.presetRow, selectedPreset === preset.id && s.activeGenre]}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Воспроизвести пресет ${index + 1}: ${genreProfiles[preset.snapshot.genre].name}, ${preset.snapshot.bpm} BPM`} disabled={!ready || pending || presetBusy} style={s.presetSelect} onPress={() => playPreset(preset)}>
              <Text style={s.genreOptionTitle}>{index + 1}. {genreProfiles[preset.snapshot.genre].name}</Text>
              <Text style={s.muted}>{preset.snapshot.bpm} BPM · {voiceNames[preset.snapshot.voiceIndex]}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Удалить пресет ${index + 1}`} disabled={presetBusy} style={s.deletePreset} onPress={() => void deletePreset(preset.id)}><Text style={s.deleteIcon}>×</Text></Pressable>
          </View> : <View key={`empty-${index}`} style={s.emptyPreset}><Text style={s.muted}>{index + 1}. Свободно</Text></View>;
        })}
      </View>
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <Text style={s.footer}>Бесконечная инструментальная музыка</Text>
      <Text style={s.note}>Первая версия работает при открытом приложении. Во время музыки экран остаётся включённым; при сворачивании воспроизведение останавливается.</Text>
    </ScrollView>
    <View style={s.engine} pointerEvents="none"><WebView ref={engine} source={{ html: audioHtml }} javaScriptEnabled mediaPlaybackRequiresUserAction={false} originWhitelist={['about:blank']} onShouldStartLoadWithRequest={request => request.url === 'about:blank'} onError={() => { setReady(false); setPending(false); setPlaying(false); setError('Не удалось загрузить звук. Перезапустите приложение.'); }} onMessage={({ nativeEvent }) => {
      try {
        const message = JSON.parse(nativeEvent.data);
        if (message.type === 'ready') setReady(true);
        if (message.type === 'snapshot') void saveSnapshot(message.message);
        if (message.type === 'presetLoaded') setSelectedPreset(message.message);
        if (message.type === 'melodyPending') setMelodyPending(true);
        if (message.type === 'instrument') setInstrument(message.message);
        if (message.type === 'melody') { setMelodyNumber(message.message); setMelodyPending(false); setSelectedPreset(null); }
        if (message.type === 'playing') { setPlaying(true); setPending(false); }
        if (message.type === 'stopped') { setPlaying(false); setPending(false); }
        if (message.type === 'error') { setPlaying(false); setPending(false); setError('Не удалось включить звук. Попробуйте ещё раз.'); }
      } catch { setError('Ошибка звукового движка.'); }
    }} /></View>
    <Modal visible={genres} transparent animationType="fade" onRequestClose={() => setGenres(false)}><View style={s.overlay}><View style={s.dialog}>
      <Text style={s.genreTitle}>Выберите жанр</Text>
      <ScrollView contentContainerStyle={{ gap: 10 }}>
        {(Object.keys(genreProfiles) as GenreId[]).map(id => <Pressable key={id} accessibilityRole="radio" accessibilityState={{ checked: genre === id }} style={[s.genreOption, genre === id && s.activeGenre]} onPress={() => { setGenre(id); setGenres(false); }}>
          <Text style={genre === id ? s.green : s.genreOptionTitle}>{genre === id ? '✓  ' : ''}{genreProfiles[id].name}</Text>
          <Text style={s.muted}>{genreProfiles[id].description}</Text>
        </Pressable>)}
      </ScrollView>
      <Text style={s.note}>Все жанры без вокала. Темп сохраняется; во время музыки жанр переключается со следующего такта.</Text>
      <Pressable accessibilityRole="button" style={s.play} onPress={() => setGenres(false)}><Text style={s.playText}>Готово</Text></Pressable>
    </View></View></Modal>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0B1015' },
  content: { padding: 24, gap: 20, maxWidth: 560, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: '#F2F6EE', fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  tag: { color: '#78847E', fontSize: 9, letterSpacing: 1 },
  title: { color: '#F2F6EE', fontSize: 42, fontWeight: '700', lineHeight: 46, letterSpacing: -1.5, marginTop: 10 },
  subtitle: { color: '#929F9C', fontSize: 15, lineHeight: 22, marginTop: -8 },
  genre: { backgroundColor: '#172119', borderRadius: 20, padding: 20, gap: 10, borderWidth: 1, borderColor: '#30402A' },
  label: { fontSize: 10, fontWeight: '700', color: '#97A49A', letterSpacing: 1.6 },
  green: { color: '#BDFA68', fontSize: 13, fontWeight: '600' },
  genreTitle: { color: '#F2F6EE', fontSize: 20, fontWeight: '600' },
  muted: { color: '#8C9B92', fontSize: 12, lineHeight: 18 },
  wave: { height: 42, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden' },
  segment: { flexDirection: 'row', backgroundColor: '#182027', padding: 5, borderRadius: 15 },
  segmentButton: { flex: 1, paddingVertical: 13, alignItems: 'center', borderRadius: 11 },
  selected: { backgroundColor: '#BDFA68' },
  segmentText: { color: '#A2ADA9', fontWeight: '700', fontSize: 14 },
  tempo: { gap: 12, paddingVertical: 10 },
  bpm: { color: '#F2F6EE', fontSize: 80, fontWeight: '600', letterSpacing: -4, fontVariant: ['tabular-nums'] },
  adjust: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1C252C', alignItems: 'center', justifyContent: 'center' },
  adjustText: { color: '#C6D1CA', fontSize: 26 },
  unit: { textAlign: 'center', color: '#8C9B92', fontSize: 12, marginTop: -12, marginBottom: 8 },
  autoHint: { color: '#BDFA68', textAlign: 'center', lineHeight: 22, fontSize: 14 },
  volume: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  play: { backgroundColor: '#BDFA68', padding: 20, alignItems: 'center', borderRadius: 18 },
  player: { gap: 8 },
  rockLink: { backgroundColor: '#172119', borderColor: '#30402A', borderWidth: 1, borderRadius: 16, padding: 16, gap: 4 },
  rockLinkTitle: { color: '#BDFA68', fontSize: 17, fontWeight: '700' },
  controls: { flexDirection: 'row', gap: 12 },
  controlButton: { flex: 1, height: 62, padding: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  likeButton: { width: 48, height: 62, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#182027' },
  heartIcon: { color: '#BDFA68', fontSize: 36, lineHeight: 44 },
  nextButton: { backgroundColor: '#182027', borderWidth: 1, borderColor: '#30402A' },
  playerIcon: { color: '#17200F', fontSize: 36, lineHeight: 44 },
  nextIcon: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44 },
  nextTriangle: { color: '#BDFA68', fontSize: 36, lineHeight: 44 },
  nextBar: { backgroundColor: '#BDFA68', width: 4, height: 30, borderRadius: 1, marginLeft: 2 },
  presetList: { gap: 10 },
  presetRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#29343A', backgroundColor: '#182027' },
  presetSelect: { flex: 1, padding: 14, gap: 4 },
  deletePreset: { width: 48, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  deleteIcon: { color: '#DCA69A', fontSize: 28 },
  emptyPreset: { padding: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#29343A' },
  playerStatus: { color: '#8C9B92', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  playText: { color: '#17200F', fontSize: 17, fontWeight: '800' },
  footer: { color: '#8C9B92', textAlign: 'center', fontSize: 12, marginTop: -7 },
  note: { color: '#7E8E89', fontSize: 12, lineHeight: 19 },
  error: { color: '#FFAE9E', fontSize: 13 },
  engine: { position: 'absolute', width: 1, height: 1, opacity: 0, left: 0, bottom: 0 },
  overlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: '#111A20', padding: 20, borderRadius: 24, gap: 16, maxHeight: '90%' },
  genreOption: { backgroundColor: '#182027', borderRadius: 14, padding: 16, gap: 6, borderWidth: 1, borderColor: '#29343A' },
  activeGenre: { backgroundColor: '#172119', borderColor: '#BDFA68' },
  genreOptionTitle: { color: '#F2F6EE', fontSize: 14, fontWeight: '600' },
});
