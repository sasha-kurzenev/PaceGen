// Real Chromium Web Audio render (no network assets, no speakers). Saves local WAV previews.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { audioHtml, genreProfiles } from '../src/audioEngine.ts';
const genres = Object.keys(genreProfiles), results = [];
await mkdir('.expo/audio-qa', { recursive: true });
const engine = audioHtml.match(/<script>([\s\S]*)<\/script>/)[1]
  .replace('ctx.currentTime+0.12', '7'); // Offline scheduling horizon instead of the live clock.
let complete;
const finished = new Promise(resolve => { complete = resolve; });
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/result') {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const genre = url.searchParams.get('genre');
    if (!genres.includes(genre)) { res.writeHead(400).end(); return; }
    await writeFile(`.expo/audio-qa/${genre}.wav`, Buffer.concat(chunks));
    const report = JSON.parse(url.searchParams.get('report'));
    results.push({ genre, ...report });
    res.end('ok');
    if (results.length === genres.length) complete();
    return;
  }
  if (req.method === 'POST' && url.pathname === '/error') {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    results.push({ error: Buffer.concat(chunks).toString() }); res.end(); complete(); return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (url.pathname === '/render') {
    const genre = url.searchParams.get('genre');
    if (!genres.includes(genre)) { res.writeHead(400).end(); return; }
    res.end(`<!doctype html><script>
      window.ReactNativeWebView={postMessage:()=>{}};
      window.AudioContext=function(){return new OfflineAudioContext(2,44100*8,44100)};
      let randomSeed=1234;Math.random=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};
      ${engine}
      (async()=>{try{
        await window.control({type:'genre',genre:${JSON.stringify(genre)}});
        await init();volume=1;master.gain.value=0.65;reverb.buffer=impulse;
        target=140;bpm=140;running=true;next=0.05;schedule();
        const rendered=await ctx.startRendering(),left=rendered.getChannelData(0),right=rendered.getChannelData(1);
        let peak=0,energy=0,clipped=0,nonFinite=0;
        for(const samples of [left,right])for(const value of samples){if(!Number.isFinite(value))nonFinite++;peak=Math.max(peak,Math.abs(value));energy+=value*value;if(Math.abs(value)>=1)clipped++;}
        const report={peak,rms:Math.sqrt(energy/(left.length*2)),clipped,nonFinite,samples:Object.keys(sampleBuffers).length};
        const wav=new ArrayBuffer(44+left.length*4),view=new DataView(wav);
        const text=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
        text(0,'RIFF');view.setUint32(4,wav.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,44100,true);view.setUint32(28,176400,true);view.setUint16(32,4,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,wav.byteLength-44,true);
        for(let i=0;i<left.length;i++){view.setInt16(44+i*4,Math.max(-1,Math.min(1,left[i]))*32767,true);view.setInt16(46+i*4,Math.max(-1,Math.min(1,right[i]))*32767,true);}
        await fetch('/result?genre=${genre}&report='+encodeURIComponent(JSON.stringify(report)),{method:'POST',body:wav});parent.postMessage('done','*');
      }catch(error){await fetch('/error',{method:'POST',body:String(error.stack||error)});}})();
    </script>`);
  } else {
    res.end(`<!doctype html><title>PaceGen offline audio check</title><script>
      const genres=${JSON.stringify(genres)};let index=0;
      function next(){document.body.innerHTML='';if(index<genres.length){const frame=document.createElement('iframe');frame.src='/render?genre='+genres[index++];document.body.append(frame);}}
      window.addEventListener('message',e=>{if(e.data==='done')next();});window.onload=next;
    </script>`);
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  `--user-data-dir=${resolve('.expo/audio-qa/chrome-profile')}`, `http://127.0.0.1:${server.address().port}`,
], { windowsHide: true, stdio: 'ignore' });
chrome.on('error', error => { results.push({ error: error.message }); complete(); });
const timeout = setTimeout(() => { results.push({ error: 'Render timed out' }); complete(); }, 45000);
await finished;
clearTimeout(timeout);chrome.kill();server.close();
await writeFile('.expo/audio-qa/results.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
if(results.length !== genres.length || results.some(r=>r.error||r.nonFinite||r.clipped||r.rms<0.01||r.samples!==9))process.exitCode=1;
