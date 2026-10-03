#!/usr/bin/env node
/**
 * beforeShellExecution 가드 — 라이브(senalink) 데이터·다른 Firebase 프로젝트·시크릿 보호.
 * deny: 되돌릴 수 없는 명령 / ask: 밍봉 확인이 필요한 명령 / 그 외 allow.
 * 스크립트 오류 시 fail-open (hooks.json에 failClosed 없음) — 일반 작업을 막지 않기 위함.
 */

const LIVE_PROJECT = 'senalink';

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { data += c; });
    process.stdin.on('end', () => resolve(data));
  });
}

function decide(cmd) {
  const c = cmd.replace(/\s+/g, ' ');
  const isFirebase = /\bfirebase(-tools)?\b/.test(c);

  if (isFirebase) {
    const projects = [...c.matchAll(/(?:--project|-P)[= ]([\w-]+)/g)].map((m) => m[1]);
    const used = /\bfirebase(?:-tools)? use ([\w-]+)/.exec(c)?.[1];
    if (used && !used.startsWith('-')) projects.push(used);
    const other = projects.find((p) => p !== LIVE_PROJECT);
    if (other) {
      return ['deny', `senalink 외 Firebase 프로젝트(${other}) 명령은 막혀 있어요.`,
        `Blocked: Firebase project "${other}" is not allowed. Only "${LIVE_PROJECT}" (AGENTS.md hard rule).`];
    }
    if (/\bfirestore:delete\b|\bdatabase:remove\b|\bauth:import\b|\bfunctions:delete\b|\bhosting:disable\b|\bfirestore:databases:delete\b/.test(c)) {
      return ['deny', '라이브 데이터·서비스를 지우는 Firebase 명령은 막혀 있어요. 콘솔에서 직접 해 주세요.',
        'Blocked: destructive Firebase command on live data (AGENTS.md §2.1). Ask 밍봉 to do it in the console.'];
    }
    if (/\bdeploy\b/.test(c)) {
      const scope = /--only[= ](\S+)/.exec(c)?.[1] || '전체(hosting+rules+functions+storage)';
      const risky = /firestore|storage|functions/.test(scope) || !/--only/.test(c);
      return ['ask', `라이브 senalink 배포: ${scope}${risky ? ' — rules/Functions 포함, 영향 범위를 확인하세요.' : ''}`,
        `Live deploy requires 밍봉 confirmation. Scope: ${scope}. Make sure the user explicitly asked for this deploy.`];
    }
  }

  if (/\bgcloud\b.*\bfirestore\b.*\b(delete|import)\b/.test(c) || /\bgsutil\b.*\brm\b/.test(c)) {
    return ['deny', '라이브 Firestore/Storage 일괄 삭제·덮어쓰기 명령은 막혀 있어요.',
      'Blocked: bulk delete/import on live Firestore/Storage (AGENTS.md §2.1).'];
  }

  if (/\bgit push\b/.test(c) && /(\s--force(?!-with-lease)\b|\s-f\b|\s\+\S)/.test(c)) {
    return ['deny', '강제 푸시(--force)는 막혀 있어요.', 'Blocked: force push. Use a normal push.'];
  }

  if (/\bgit add\b/.test(c) && /(^|[\s/'"])\.env(?!\.example|\.development)(\.[\w.-]+)?(?=$|[\s'"])/.test(c)) {
    return ['deny', '.env 시크릿 파일은 커밋할 수 없어요.', 'Blocked: staging/committing secret .env files.'];
  }

  if (/\bgit add (-A|--all|\.)(\s|$)/.test(c)) {
    return ['ask', '전체 스테이징(git add -A / .)이에요. asset/ 원본·임시 파일·시크릿이 섞이지 않는지 확인하세요.',
      'Prefer staging explicit paths. Never commit asset/, tmp_* files, .env*, or .firebase/hosting.*.cache.'];
  }

  return ['allow'];
}

const raw = await readStdin();
let command = '';
try {
  command = String(JSON.parse(raw || '{}').command || '');
} catch {
  command = '';
}

const [permission, userMessage, agentMessage] = decide(command);
const out = { permission };
if (userMessage) out.user_message = userMessage;
if (agentMessage) out.agent_message = agentMessage;
process.stdout.write(JSON.stringify(out));
