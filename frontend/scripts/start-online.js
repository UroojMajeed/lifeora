// `npm run start:online`: test from any network. A free Cloudflare quick tunnel (no account needed)
// sits in front of Metro, Expo's QR code points at it, and the app talks to the online backend.
// (Replaces `expo start --tunnel`, whose shared ngrok account often hits its connection limit.)
const { spawn } = require('child_process');
const fs = require('fs');
const { bin, install } = require('cloudflared');

const PORT = 8081;
const API_URL = 'https://lifeora-nine.vercel.app/api';
const ATTEMPTS = 5; // Cloudflare's free tunnels are sometimes slow to answer; keep trying a while
// The tunnel's own address, e.g. https://joy-received-contributed-bull.trycloudflare.com.
// (Not api.trycloudflare.com, which only shows up in Cloudflare's error messages.)
const TUNNEL_URL = /https:\/\/(?!api\.)[a-z0-9]+(?:-[a-z0-9]+)+\.trycloudflare\.com/;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function openTunnel() {
  const tunnel = spawn(bin, ['tunnel', '--url', `http://localhost:${PORT}`, '--no-autoupdate'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let lastError = '';
  const url = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      tunnel.kill();
      reject(new Error('the tunnel did not start within 45 seconds'));
    }, 45000);
    const read = (chunk) => {
      const text = String(chunk);
      const errLine = text.split('\n').find((l) => / ERR |error|failed/i.test(l));
      if (errLine) lastError = errLine.trim();
      const match = text.match(TUNNEL_URL);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    };
    tunnel.stdout.on('data', read);
    tunnel.stderr.on('data', read);
    tunnel.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(lastError || `cloudflared stopped (exit code ${code})`));
    });
  });
  return { tunnel, url };
}

async function openTunnelWithRetry() {
  for (let attempt = 1; ; attempt += 1) {
    const { tunnel, url } = openTunnel();
    try {
      return { tunnel, proxyUrl: await url };
    } catch (err) {
      if (attempt >= ATTEMPTS) throw err;
      console.log(`Cloudflare didn't open a tunnel (attempt ${attempt} of ${ATTEMPTS}). Trying again…`);
      await wait(4000 * attempt);
    }
  }
}

(async () => {
  if (!fs.existsSync(bin)) {
    console.log('Downloading the tunnel program (one time)…');
    await install(bin);
  }

  console.log('Opening a tunnel so your phone can reach this laptop from any network…');
  const { tunnel, proxyUrl } = await openTunnelWithRetry();
  console.log(`Tunnel ready: ${proxyUrl}\n`);

  const args = ['expo', 'start', '--go', '--clear', '--port', String(PORT), ...process.argv.slice(2)];
  const expo = spawn(`npx ${args.join(' ')}`, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, EXPO_PUBLIC_API_URL: API_URL, EXPO_PACKAGER_PROXY_URL: proxyUrl },
  });

  let stopping = false;
  const stop = () => {
    stopping = true;
    tunnel.kill();
    expo.kill();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  // If the tunnel drops, the QR code stops working: say so plainly instead of leaving a dead link.
  tunnel.on('exit', () => {
    if (stopping) return;
    console.error('\nThe tunnel to your phone closed. Press Ctrl+C, then run `npm run start:online` again.\n');
  });
  expo.on('exit', (code) => {
    tunnel.kill();
    process.exit(code ?? 0);
  });
})().catch((err) => {
  console.error(`Could not start the online dev server: ${err.message}`);
  console.error('Try again in a minute, or if your phone is on the same Wi-Fi, use `npm run start:wifi`.');
  process.exit(1);
});
