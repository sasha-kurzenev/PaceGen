import { mkdir, writeFile } from 'node:fs/promises';
import { rockAudioHtml } from '../../src/music/rockAudioHtml.ts';

await mkdir('.expo/rock-demo', { recursive: true });
const html = rockAudioHtml.replace('<script>', '<script>window.ReactNativeWebView={postMessage:message=>console.log(message)};');
await writeFile('.expo/rock-demo/app-engine.html', html);
console.log(`${html.length} characters of self-contained audio HTML`);
