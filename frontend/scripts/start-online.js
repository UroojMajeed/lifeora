// `npm run start:online`: test from any network. A free Cloudflare quick tunnel (no account needed)
// sits in front of Metro, Expo's QR code points at it, and the app talks to the online backend.
// (Replaces `expo start --tunnel`, whose shared ngrok account often hits its connection limit.)
const { spawn } = require('child_process');
const fs = require('fs');
const { bin, install } = require('cloudflared');

const PORT = 8081;
const API_URL = 'https://lifeora-nine.vercel.app/api';

function openTunnel() {
  const tunnel = spawn(bin, ['tunnel', '--url', `http://localhost:${PORT}`, '--no-autoupdate'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const url = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('the tunnel did not start within 45 seconds')), 45000);
    const read = (chunk) => {
      const match = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    };
    tunnel.stdout.on('data', read);
    tunnel.stderr.on('data', read);
    tunnel.on('exit', (code) => reject(new Error(`cloudflared stopped (exit code ${code})`)));
  });
  return { tunnel, url };
}

(async () => {
  if (!fs.existsSync(bin)) {
    console.log('Downloading the tunnel program (one time)…');
    await install(bin);
  }

  console.log('Opening a tunnel so your phone can reach this laptop from any network…');
  const { tunnel, url } = openTunnel();
  const proxyUrl = await url;
  console.log(`Tunnel ready: ${proxyUrl}\n`);

  const args = ['expo', 'start', '--go', '--clear', '--port', String(PORT), ...process.argv.slice(2)];
  const expo = spawn(`npx ${args.join(' ')}`, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, EXPO_PUBLIC_API_URL: API_URL, EXPO_PACKAGER_PROXY_URL: proxyUrl },
  });

  const stop = () => {
    tunnel.kill();
    expo.kill();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  expo.on('exit', (code) => {
    tunnel.kill();
    process.exit(code ?? 0);
  });
})().catch((err) => {
  console.error(`Could not start the online dev server: ${err.message}`);
  console.error('Same Wi-Fi as your phone? Use `npm run start:wifi` instead.');
  process.exit(1);
});
