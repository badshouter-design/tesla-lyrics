const API = 'https://lrclib.net/api';

async function check(label, q) {
  const res = await fetch(API + '/search?q=' + encodeURIComponent(q));
  if (!res.ok) throw new Error(label + ' search HTTP ' + res.status);
  const data = await res.json();
  if (!data.length) throw new Error(label + ' no results');
  const withSync = data.find((x) => x.syncedLyrics);
  const pick = withSync || data[0];
  console.log(label + ': found', data.length, 'results; pick', pick.trackName, '-', pick.artistName,
    '| synced=', !!pick.syncedLyrics, '| duration=', pick.duration);
  const get = await fetch(API + '/get/' + pick.id);
  if (!get.ok) throw new Error(label + ' get HTTP ' + get.status);
  const full = await get.json();
  console.log(label + ': /get ok, synced lines≈',
    full.syncedLyrics ? full.syncedLyrics.split('\n').filter((l) => /\[\d/.test(l)).length : 0,
    '| plain chars=', (full.plainLyrics || '').length);
  // Korean script check for IU
  if (label === 'Korean') {
    const hasHangul = /[\uAC00-\uD7A3]/.test(full.syncedLyrics || full.plainLyrics || '');
    if (!hasHangul) throw new Error('Korean lyrics missing Hangul');
    console.log(label + ': Hangul present ✓');
  }
  return full;
}

(async () => {
  await check('Korean', 'IU Love wins all');
  await check('English', 'Billie Eilish Birds of a Feather');
  console.log('\nAPI tests passed.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
