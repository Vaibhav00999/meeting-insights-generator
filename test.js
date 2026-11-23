const assert = require('assert');
const { parseLines, parseVttSrt, analyse, toMarkdown, DEMO_TRANSCRIPT } = require('./app.js');

// 1. Parse demo
const turns = parseLines(DEMO_TRANSCRIPT);
assert.strictEqual(turns.length, 10, 'demo should have 10 turns, got ' + turns.length);
assert.strictEqual(turns[0].speaker, 'Priya');
assert.strictEqual(turns[0].time, '00:00');

// 2. Analyse demo
const a = analyse(turns);
console.log('stats:', a.stats);
console.log('summary:', a.summary);
console.log('actions:', a.actions.map(x => x.owner + ' | ' + x.due + ' | ' + x.text.slice(0, 60)));
console.log('decisions:', a.decisions);
console.log('speakers:', a.speakers);
console.log('keywords:', a.keywords.slice(0, 5));
assert.ok(a.stats.words > 150, 'demo words');
assert.ok(a.summary.toLowerCase().includes('5 december'), 'summary must mention 5 December launch');
assert.ok(a.actions.length >= 4, 'at least 4 actions, got ' + a.actions.length);
assert.ok(a.actions.some(x => x.due && /28 november/i.test(x.due) && /checkout fix/i.test(x.text)), 'checkout-fix 28 Nov action');
assert.ok(a.decisions.length >= 1, 'at least 1 decision');
assert.ok(a.speakers.find(s => s.name === 'Priya'), 'Priya speaker share');
assert.ok(Math.abs(a.speakers.reduce((s, x) => s + x.share, 0) - 100) <= 2, 'speaker shares ~100%');
assert.ok(a.timeline.length === 10, 'timeline 10 entries');
assert.ok(a.keywords.length >= 5, 'keywords');

// 3. VTT parsing
const vtt = 'WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nPriya: Hello team.\n\n00:00:04.000 --> 00:00:06.000\nArjun: We will ship by Friday.';
const vt = parseVttSrt(vtt);
assert.strictEqual(vt.length, 2, 'VTT 2 turns, got ' + vt.length);
assert.strictEqual(vt[1].speaker, 'Arjun');

// 4. Empty / short input does not crash
const empty = analyse(parseLines(''));
assert.ok(empty.summary.length > 0);
const short = analyse(parseLines('Sam: Hi.'));
assert.strictEqual(short.stats.turns, 1);

// 5. Markdown export
const md = toMarkdown('Meeting Insights', turns, a);
assert.ok(md.includes('# Meeting Insights') && md.includes('## Action items') && md.includes('5 December'));
console.log('Markdown bytes:', md.length);
console.log('ALL TESTS PASSED');
