import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const uid = process.argv[2];
if (!uid) {
  console.error('사용법: npm run seed:admin -- <Firebase_UID>');
  process.exit(1);
}

function loadEnv(file) {
  const p = resolve(dirname(fileURLToPath(import.meta.url)), '..', file);
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const env = { ...loadEnv('.env.example'), ...loadEnv('.env.development'), ...loadEnv('.env.local') };
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) {
  console.error('VITE_FIREBASE_PROJECT_ID 가 없습니다. .env.local 을 확인해 주세요.');
  process.exit(1);
}

const url = `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/admins/${encodeURIComponent(uid)}`;

const body = {
  fields: {
    role: { stringValue: 'super' },
    seededAt: { stringValue: new Date().toISOString() },
  },
};

const res = await fetch(url, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

if (!res.ok) {
  const text = await res.text();
  console.error('시드 실패. 에뮬레이터가 켜져 있는지 확인하세요.');
  console.error(text);
  process.exit(1);
}

console.log(`에뮬레이터 슈퍼관리자 등록: admins/${uid}`);
