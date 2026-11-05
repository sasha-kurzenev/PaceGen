// Desktop Chromium smoke test for the self-contained Android sound probe.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const html = await readFile('.expo/guitar-spike/mobile.html', 'utf8');
let finish;
const done = new Promise(resolve => { finish = resolve; });
const server = createServer(async (request, response) => {
  if (request.url === '/result' && request.method === 'POST') {
    let body = '';
    for await (const chunk of request) body += chunk;
    response.end('ok');
    finish(JSON.parse(body));
    return;
  }
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(html.replace('</body>', `<script>
    window.addEventListener('load', async () => {
      document.getElementById('transport').click();
      setTimeout(async () => {
        const report = {
          status: document.getElementById('status').textContent,
          decoded: document.getElementById('samples').textContent,
          late: document.getElementById('late').textContent,
          contextState: context?.state,
          activeSources: sources.size,
        };
        await fetch('/result', { method: 'POST', body: JSON.stringify(report) });
      }, 2200);
    });
  </script></body>`));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--autoplay-policy=no-user-gesture-required',
  `--user-data-dir=${resolve('.expo/guitar-spike/chrome-profile')}`,
  `http://127.0.0.1:${server.address().port}`,
], { windowsHide: true, stdio: 'ignore' });
chrome.on('error', error => finish({ error: error.message }));
const timeout = setTimeout(() => finish({ error: 'Chrome test timed out' }), 30000);
const report = await done;
clearTimeout(timeout);
chrome.kill();
server.close();
console.log(JSON.stringify(report, null, 2));
if (report.error || report.status !== 'Играет' || report.decoded !== '5'
  || report.contextState !== 'running' || report.activeSources < 1 || Number(report.late) > 0) {
  process.exitCode = 1;
}
