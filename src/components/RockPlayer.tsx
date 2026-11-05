import React, { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import { generateRockFragment } from '../music/generate';
import { melodicRockProfile } from '../music/profiles';
import { MUSIC_ALGORITHM_VERSION } from '../music/rng';
import { rockAudioHtml } from '../music/rockAudioHtml';
import { parseRockPresets, type RockPreset } from '../music/rockPresets';

const PRESETS_KEY = 'pacegen.rock.presets.v1';
const TEMPO_KEY = 'pacegen.rock.tempo.v1';
const VOLUME_KEY = 'pacegen.rock.volume.v1';
function KeepAwake() { useKeepAwake(); return null; }

export default function RockPlayer() {
  const engine = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [pending, setPending] = useState(false);
  const [seed, setSeed] = useState(20261105);
  const seedRef = useRef(seed);
  const [bpm, setBpm] = useState<number>(melodicRockProfile.bpm.default);
  const bpmRef = useRef<number>(bpm);
  const [volume, setVolume] = useState(0.55);
  const volumeRef = useRef(volume);
  const [presets, setPresets] = useState<RockPreset[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState({ bar: 1, late: 0, jitter: 0, decode: '—' });
  const [foreground, setForeground] = useState(true);
  const send = (command: object) => engine.current?.injectJavaScript(`window.control(${JSON.stringify(command)});true;`);

  useEffect(() => {
    let cancelled = false;
    Promise.all([AsyncStorage.getItem(TEMPO_KEY), AsyncStorage.getItem(VOLUME_KEY), AsyncStorage.getItem(PRESETS_KEY)])
      .then(([storedBpm, storedVolume, storedPresets]) => {
        if (cancelled) return;
        const tempo = Number(storedBpm);
        if (storedBpm !== null && Number.isInteger(tempo) && tempo >= 100 && tempo <= 150) {
          bpmRef.current = tempo; setBpm(tempo);
        }
        const level = Number(storedVolume);
        if (storedVolume !== null && Number.isFinite(level) && level >= 0 && level <= 1) {
          volumeRef.current = level; setVolume(level);
        }
        setPresets(parseRockPresets(storedPresets));
      }).catch(() => { if (!cancelled) setError('Не удалось прочитать рок-пресеты.'); });
    const app = AppState.addEventListener('change', state => {
      setForeground(state === 'active');
      if (state !== 'active') { send({ type: 'stop' }); setPlaying(false); setPending(false); }
    });
    return () => { cancelled = true; app.remove(); send({ type: 'stop' }); };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const timeout = setTimeout(() => {
      send({ type: 'stop' }); setPending(false); setPlaying(false);
      setError('Звук не ответил. Попробуйте ещё раз.');
    }, 6000);
    return () => clearTimeout(timeout);
  }, [pending]);

  function start(nextSeed = seedRef.current, nextBpm = bpmRef.current, nextVolume = volumeRef.current) {
    if (!ready) return;
    seedRef.current = nextSeed; setSeed(nextSeed);
    bpmRef.current = nextBpm; setBpm(nextBpm);
    volumeRef.current = nextVolume; setVolume(nextVolume);
    void AsyncStorage.multiSet([[TEMPO_KEY, String(nextBpm)], [VOLUME_KEY, String(nextVolume)]])
      .catch(() => setError('Не удалось сохранить настройки рока.'));
    setError(''); setNotice(''); setPending(true);
    send({ type: 'start', fragment: generateRockFragment(nextSeed, nextBpm),
      next: generateRockFragment((nextSeed + 1) >>> 0, nextBpm), volume: nextVolume });
  }

  function next() {
    const value = (seedRef.current + 1) >>> 0;
    seedRef.current = value; setSeed(value);
    if (playing) start(value);
  }

  async function like() {
    if (presets.length >= 10) { setNotice('Все 10 мест заняты. Удалите один пресет.'); return; }
    const preset: RockPreset = { id: `${Date.now()}-${seedRef.current}`, algorithmVersion: MUSIC_ALGORITHM_VERSION,
      seed: seedRef.current, bpm: bpmRef.current, volume: volumeRef.current };
    const updated = [...presets, preset];
    try { await AsyncStorage.setItem(PRESETS_KEY, JSON.stringify(updated)); setPresets(updated); setNotice('♥ Фрагмент сохранён'); }
    catch { setError('Не удалось сохранить фрагмент.'); }
  }

  async function remove(id: string) {
    const updated = presets.filter(item => item.id !== id);
    try { await AsyncStorage.setItem(PRESETS_KEY, JSON.stringify(updated)); setPresets(updated); setNotice('Пресет удалён'); }
    catch { setError('Не удалось удалить пресет.'); }
  }

  return <SafeAreaView style={s.page}>
    <StatusBar barStyle="light-content" />
    {playing && foreground && <KeepAwake />}
    <ScrollView contentContainerStyle={s.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Вернуться к электронным жанрам" onPress={() => {
        send({ type: 'stop' }); router.back();
      }}><Text style={s.back}>‹ Электронные жанры</Text></Pressable>
      <Text style={s.title}>Мелодичный рок</Text>
      <Text style={s.subtitle}>Гитара, бас и ударные. Новая композиция рождается из seed и развивается каждые 32 такта.</Text>
      <View style={s.card}>
        <Text style={s.label}>КОМПОЗИЦИЯ</Text>
        <Text style={s.seed}>#{seed}</Text>
        <Text style={s.muted}>Такт {metrics.bar} / 32 · {bpm} BPM</Text>
      </View>
      <View style={s.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel="Сохранить рок-композицию" disabled={!ready} style={s.like} onPress={() => void like()}><Text style={s.heart}>♡</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={playing ? 'Остановить рок' : 'Включить рок'} disabled={!ready || pending} style={s.play} onPress={() => playing ? send({ type: 'stop' }) : start()}><Text style={s.playIcon}>{pending ? '…' : playing ? '■' : '▶'}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Следующая рок-композиция" disabled={!ready || pending} style={s.next} onPress={next}><Text style={s.nextIcon}>▶❘</Text></Pressable>
      </View>
      <Text style={s.status}>{!ready ? 'Подготовка звука…' : pending ? 'Загружаем сэмплы…' : playing ? 'Играет' : 'Остановлено'}</Text>
      <View style={s.card}>
        <View style={s.row}><Text style={s.label}>ТЕМП</Text><Text style={s.value}>{bpm} BPM</Text></View>
        <Slider accessibilityLabel="Темп рока" minimumValue={100} maximumValue={150} step={1} value={bpm}
          onValueChange={value => setBpm(value)} onSlidingComplete={value => {
            const tempo = Math.round(value); bpmRef.current = tempo; setBpm(tempo);
            void AsyncStorage.setItem(TEMPO_KEY, String(tempo)).catch(() => setError('Не удалось сохранить темп.'));
            if (playing) start(seedRef.current, tempo);
          }} minimumTrackTintColor="#BDFA68" maximumTrackTintColor="#303A43" thumbTintColor="#BDFA68" />
        <Text style={s.muted}>100–150 BPM · при смене темпа фрагмент начинается сначала</Text>
      </View>
      <View style={s.card}>
        <View style={s.row}><Text style={s.label}>ГРОМКОСТЬ</Text><Text style={s.value}>{Math.round(volume * 100)}%</Text></View>
        <Slider accessibilityLabel="Громкость рока" minimumValue={0} maximumValue={1} value={volume}
          onValueChange={value => { volumeRef.current = value; setVolume(value); send({ type: 'volume', value }); }}
          onSlidingComplete={value => { void AsyncStorage.setItem(VOLUME_KEY, String(value)).catch(() => setError('Не удалось сохранить громкость.')); }}
          minimumTrackTintColor="#BDFA68" maximumTrackTintColor="#303A43" thumbTintColor="#BDFA68" />
      </View>
      <View style={s.card}>
        <View style={s.row}><Text style={s.label}>ИЗБРАННОЕ</Text><Text style={s.muted}>{presets.length} / 10</Text></View>
        <Text style={s.muted}>Сердечко сохраняет seed, версию алгоритма, темп и громкость.</Text>
        {presets.map((preset, index) => <View key={preset.id} style={s.preset}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Воспроизвести рок-пресет ${index + 1}`} disabled={!ready || pending} style={s.presetPlay} onPress={() => start(preset.seed, preset.bpm, preset.volume)}>
            <Text style={s.presetTitle}>{index + 1}. Композиция #{preset.seed}</Text><Text style={s.muted}>{preset.bpm} BPM</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Удалить рок-пресет ${index + 1}`} onPress={() => void remove(preset.id)}><Text style={s.delete}>×</Text></Pressable>
        </View>)}
        {!!notice && <Text style={s.good}>{notice}</Text>}
      </View>
      <Text style={s.muted}>Опоздавшие события: {metrics.late} · макс. задержка таймера: {metrics.jitter} мс · декодирование: {metrics.decode}</Text>
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <Text style={s.muted}>Рок-режим пока работает при открытом приложении. При сворачивании воспроизведение останавливается.</Text>
    </ScrollView>
    <View pointerEvents="none" style={s.engine}><WebView ref={engine} source={{ html: rockAudioHtml }} javaScriptEnabled
      mediaPlaybackRequiresUserAction={false} originWhitelist={['about:blank']}
      onShouldStartLoadWithRequest={request => request.url === 'about:blank'}
      onError={() => { setReady(false); setPending(false); setPlaying(false); setError('Не удалось загрузить рок-движок.'); }}
      onMessage={({ nativeEvent }) => {
        try {
          const message = JSON.parse(nativeEvent.data);
          if (message.type === 'ready') setReady(true);
          if (message.type === 'playing') { setPlaying(true); setPending(false); }
          if (message.type === 'stopped') { setPlaying(false); setPending(false); }
          if (message.type === 'decoded') setMetrics(previous => ({ ...previous, decode: `${message.message.milliseconds} мс` }));
          if (message.type === 'metrics') setMetrics(previous => ({ ...previous, ...message.message }));
          if (message.type === 'nextStarted') {
            const value = message.message as number;
            seedRef.current = value; setSeed(value);
            send({ type: 'setUpcoming', fragment: generateRockFragment((value + 1) >>> 0, bpmRef.current) });
          }
          if (message.type === 'error') { setError(String(message.message)); setPlaying(false); setPending(false); }
        } catch { setError('Ошибка ответа звукового движка.'); }
      }} /></View>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0B1015' },
  content: { padding: 24, gap: 18, paddingBottom: 50 },
  back: { color: '#BDFA68', fontSize: 16 },
  title: { color: '#F2F6EE', fontSize: 32, fontWeight: '700' },
  subtitle: { color: '#A3AFA8', fontSize: 15, lineHeight: 23 },
  card: { backgroundColor: '#172119', borderRadius: 18, padding: 18, gap: 10, borderWidth: 1, borderColor: '#30402A' },
  label: { color: '#9DAC9E', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  seed: { color: '#F2F6EE', fontSize: 24, fontWeight: '700' },
  muted: { color: '#9DAC9E', fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  value: { color: '#F2F6EE', fontSize: 17, fontWeight: '700' },
  controls: { flexDirection: 'row', gap: 12 },
  like: { width: 52, height: 62, backgroundColor: '#182027', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  play: { flex: 1, height: 62, backgroundColor: '#BDFA68', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  next: { flex: 1, height: 62, backgroundColor: '#182027', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#30402A' },
  heart: { color: '#BDFA68', fontSize: 36 },
  playIcon: { color: '#17200F', fontSize: 36 },
  nextIcon: { color: '#BDFA68', fontSize: 31 },
  status: { color: '#BDFA68', textAlign: 'center', fontSize: 13 },
  preset: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#30402A', paddingTop: 9 },
  presetPlay: { flex: 1 },
  presetTitle: { color: '#F2F6EE', fontSize: 14, fontWeight: '600' },
  delete: { color: '#DCA69A', fontSize: 28, paddingHorizontal: 12 },
  good: { color: '#BDFA68', fontSize: 13 },
  error: { color: '#FFAE9E', fontSize: 13 },
  engine: { position: 'absolute', width: 1, height: 1, opacity: 0, left: 0, bottom: 0 },
});
