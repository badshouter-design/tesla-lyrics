/**
 * Small Node test for LRC parsing (mirrors browser parseLRC).
 */
function parseTimeTag(tag) {
  const m = tag.match(/^(\d{1,3}):(\d{1,2})(?:\.(\d{1,3}))?$/);
  if (!m) return null;
  const min = parseInt(m[1], 10);
  const sec = parseInt(m[2], 10);
  let frac = 0;
  if (m[3] != null) {
    const f = m[3];
    frac = parseInt(f, 10) / Math.pow(10, f.length);
  }
  return min * 60 + sec + frac;
}

function parseLRC(lrc) {
  if (!lrc) return { lines: [], offsetMs: 0 };
  let offsetMs = 0;
  const out = [];
  const raw = lrc.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lineRe = /\[([^\]]+)\]/g;
  for (const rawLine of raw) {
    const line = rawLine.trim();
    if (!line) continue;
    const meta = line.match(/^\[(ti|ar|al|by|offset|re|ve|length):([^\]]*)\]$/i);
    if (meta) {
      if (meta[1].toLowerCase() === 'offset') offsetMs = parseInt(meta[2].trim(), 10) || 0;
      continue;
    }
    const tags = [];
    let lastIdx = 0;
    let m;
    lineRe.lastIndex = 0;
    while ((m = lineRe.exec(line)) !== null) {
      const t = parseTimeTag(m[1]);
      if (t != null) {
        tags.push(t);
        lastIdx = m.index + m[0].length;
      } else break;
    }
    if (!tags.length) continue;
    const text = line.slice(lastIdx).trim();
    for (const t of tags) out.push({ time: t, text });
  }
  out.sort((a, b) => a.time - b.time || a.text.localeCompare(b.text));
  return { lines: out, offsetMs };
}

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('  OK:', msg);
}

const sample = `[ti:Test]
[ar:Artist]
[offset:500]
[00:01.00] First line
[00:02.50][00:10.00] Shared text
[01:02.345] Milliseconds
[99:00.0] Far
`;

console.log('LRC parse tests');
const r = parseLRC(sample);
assert(r.offsetMs === 500, 'offset tag = 500ms');
assert(r.lines.length === 5, '5 lyric entries (multi-ts expands)');
assert(r.lines[0].time === 1 && r.lines[0].text === 'First line', 'first line 1.00s');
assert(r.lines[1].time === 2.5 && r.lines[1].text === 'Shared text', 'multi-ts first');
assert(r.lines[2].time === 10 && r.lines[2].text === 'Shared text', 'multi-ts second');
assert(Math.abs(r.lines[3].time - 62.345) < 1e-9, 'mm:ss.xxx parse');
assert(r.lines[4].time === 99 * 60, 'long timestamp');

const empty = parseLRC('');
assert(empty.lines.length === 0 && empty.offsetMs === 0, 'empty input');

const negOff = parseLRC('[offset:-1200]\n[00:05.00] Hi');
assert(negOff.offsetMs === -1200, 'negative offset');
assert(negOff.lines[0].text === 'Hi', 'text after tags');

console.log('\nAll parse tests passed.');
