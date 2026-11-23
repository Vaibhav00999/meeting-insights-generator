/* Meeting Insights Generator — StackUp Nov 2026
   3 modalities, 0 servers, 0 API keys.
   Core logic is pure JS so it can be tested in Node (see test.js).
   In the browser it is wired to the DOM at the bottom. */
'use strict';

const STOP = new Set(('a,an,the,and,or,but,if,then,else,when,at,by,for,with,about,against,between,into,through,during,before,after,above,below,to,from,up,down,in,out,on,off,over,under,again,further,once,here,there,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,can,will,just,don,should,now,is,are,was,were,be,been,being,have,has,had,having,do,does,did,doing,would,could,shall,may,might,must,i,you,he,she,it,we,they,this,that,these,those,am,an,as,of,me,my,our,your,his,her,their,its,who,whom,what,which,how,why,let,lets,also,one,two,us,go,going,get,got,make,think,know,like,see,well,yes,yeah,ok,okay,um,uh,hi,hello,thanks,thank,please,sure,right,yeah').split(','));
const ACTION_VERBS = ['will','should','need to','must','assign','send','share','update','fix','ship','launch','review','prepare','follow up','check','confirm','book','schedule','create','write','call','email','deliver','complete','finish','start','own','take'];
const DECISION_WORDS = ['decided','agreed','decision','we will go with','chosen','choose','approved','confirmed','final','locked in','go ahead','settled','we will use'];
const DATE_RE = /\b(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|tomorrow|today|next week|next monday|next tuesday|next wednesday|next thursday|next friday|by friday|by monday|by (?:eod|end of (?:day|week))|december \d{1,2}|november \d{1,2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i;

function parseLines(text) {
  const lines = String(text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const turns = [];
  for (const line of lines) {
    // [00:12] Priya: words  |  00:12 Priya: words  |  Priya: words  |  plain words
    const m = line.match(/^(?:\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+)?(?:([A-Z][A-Za-z]{1,20})\s*:\s*)?(.+)$/);
    if (!m) continue;
    turns.push({ time: m[1] || null, speaker: m[2] || 'Speaker', text: m[3].trim() });
  }
  return turns;
}
function parseVttSrt(text) {
  // Strip cue numbers / timestamps, keep the spoken words, one cue = one line.
  const cleaned = String(text).replace(/^\s*WEBVTT.*$/mi, '')
    .replace(/^\d+\s*$/gm, '')
    .replace(/^\d{1,2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*.*$/gm, '')
    .replace(/<[^>]+>/g, '');
  return parseLines(cleaned);
}
function splitSentences(text) {
  return String(text).split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 3);
}
function wordsOf(s) { return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w)); }

function scoreSentence(sent, freq) {
  let s = 0; const low = sent.toLowerCase();
  if (/\d/.test(sent)) s += 2;                       // numbers / dates matter
  if (DATE_RE.test(sent)) s += 2;
  if (DECISION_WORDS.some(w => low.includes(w))) s += 3;
  if (ACTION_VERBS.some(w => low.includes(w))) s += 2;
  if (/launch|deadline|budget|price|revenue|customer|checkout|release|ship/i.test(sent)) s += 1;
  for (const w of wordsOf(sent)) s += Math.min(freq[w] || 0, 3) * 0.15;
  if (sent.length > 140) s -= 1;                     // very long = less quotable
  if (sent.length < 25) s -= 0.5;
  return s;
}

function analyse(turns) {
  const allText = turns.map(t => t.text).join(' ');
  const sentences = [];
  turns.forEach((t, ti) => splitSentences(t.text).forEach(s => sentences.push({ sent: s, speaker: t.speaker, turn: ti, time: t.time })));
  const freq = {}; wordsOf(allText).forEach(w => freq[w] = (freq[w] || 0) + 1);
  const scored = sentences.map(o => ({ ...o, score: scoreSentence(o.sent, freq) }))
    .sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.max(3, Math.min(5, Math.ceil(sentences.length / 4))));
  // Summary = top sentences, in original order, verbatim (extractive — never invented).
  const summary = top.slice().sort((a, b) => a.turn - b.turn).map(o => o.sent).join(' ');
  // Actions — require a commitment modal (will/should/must/need to), not just a verb word.
  // This stops "the fix is ready" being counted as an action.
  const actions = [];
  for (const o of sentences) {
    const low = o.sent.toLowerCase();
    if (o.sent.length < 20) continue;
    if (/^(decided|final decision)/i.test(o.sent.trim())) continue; // a decision, not an action
    if (!/\b(will|should|must|need to|going to)\b/.test(low)) continue;
    if (/^i think\b/.test(low) && !/\bwill (send|fix|share|prepare|create|confirm|update|own)\b/.test(low)) continue;
    const date = (o.sent.match(DATE_RE) || [])[0] || null;
    const owner = o.speaker !== 'Speaker' ? o.speaker : null;
    actions.push({ text: o.sent, owner, due: date });
    if (actions.length >= 8) break;
  }
  // Decisions — drop one-word fragments like "Agreed."
  const decisions = scored.filter(o => o.sent.length > 20 && DECISION_WORDS.some(w => o.sent.toLowerCase().includes(w))).slice(0, 5).map(o => o.sent);
  // Speakers
  const spk = {}; turns.forEach(t => { spk[t.speaker] = spk[t.speaker] || { words: 0, turns: 0 }; spk[t.speaker].words += t.text.split(/\s+/).length; spk[t.speaker].turns += 1; });
  const totalWords = Object.values(spk).reduce((a, b) => a + b.words, 0) || 1;
  const speakers = Object.entries(spk).map(([name, v]) => ({ name, ...v, share: Math.round(v.words / totalWords * 100) })).sort((a, b) => b.words - a.words);
  // Timeline: first sentence of each turn, labelled by time if present else by order.
  const timeline = turns.map((t, i) => ({ label: t.time || ('T+' + String(i + 1).padStart(2, '0')), speaker: t.speaker, text: splitSentences(t.text)[0] || t.text })).slice(0, 12);
  const keywords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([word, count]) => ({ word, count }));
  return { summary: summary || 'No clear summary — the transcript is very short.', actions, decisions, speakers, timeline, keywords,
    stats: { words: allText.split(/\s+/).filter(Boolean).length, turns: turns.length, speakers: speakers.length, sentences: sentences.length } };
}

function toMarkdown(title, turns, a) {
  const L = [];
  L.push('# ' + title, '', '## Summary', '', a.summary, '', '## Action items', '');
  if (!a.actions.length) L.push('- None detected.'); else a.actions.forEach(x => L.push('- ' + (x.owner ? '**' + x.owner + '**: ' : '') + x.text + (x.due ? ' _(by ' + x.due + ')_' : '')));
  L.push('', '## Key decisions', '');
  if (!a.decisions.length) L.push('- None detected.'); else a.decisions.forEach(d => L.push('- ' + d));
  L.push('', '## Speakers', '');
  a.speakers.forEach(s => L.push('- ' + s.name + ': ' + s.share + '% (' + s.words + ' words, ' + s.turns + ' turns)'));
  L.push('', '## Transcript', '');
  turns.forEach(t => L.push('- ' + (t.time ? '[' + t.time + '] ' : '') + '**' + t.speaker + ':** ' + t.text));
  return L.join('\n');
}

const DEMO_TRANSCRIPT = [
'[00:00] Priya: Welcome everyone. Today we need to decide the launch date for the new checkout, and who owns the final checks.',
'[00:18] Arjun: The checkout fix is ready for review. I think 5 December works if we ship the fix by 28 November.',
'[00:42] Maya: I agree with 5 December, but marketing needs the landing page by 30 November, otherwise we cannot announce on 1 December.',
'[01:05] Priya: Decided — we will go with 5 December for launch. Arjun, you will own the checkout fix and ship it by 28 November.',
'[01:27] Arjun: I will send the test report to Maya by tomorrow, and I will fix the payment timeout bug by 25 November.',
'[01:48] Maya: I will prepare the launch announcement and share the draft with Priya by 30 November.',
'[02:10] Sam: The budget is 12000 dollars for launch ads. We should review the spend every Friday and stop any ad below 2 percent conversion.',
'[02:35] Priya: Agreed. Sam, you will create the weekly spend report and send it every Friday.',
'[02:52] Arjun: One risk — the payment provider may need two days for approval. I will confirm the approval timeline by 24 November.',
'[03:10] Priya: Final decision — launch on 5 December, announcement on 1 December, and no new features after 28 November. Maya, please update the roadmap today.'
].join('\n');
const DEMO_SPEAKERS = ['Priya', 'Arjun', 'Maya', 'Sam'];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseLines, parseVttSrt, analyse, toMarkdown, DEMO_TRANSCRIPT, DEMO_SPEAKERS };
}

/* ---- Browser wiring (only runs in a browser) ---- */
if (typeof document !== 'undefined') {
  let turns = [];
  let currentSpeaker = 'Priya';
  let lastAnalysis = null;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Speaker buttons
  const spkRow = $('speakerRow');
  DEMO_SPEAKERS.forEach((n, i) => {
    const b = document.createElement('button');
    b.className = 'speaker-btn' + (i === 0 ? ' active' : ''); b.textContent = n;
    b.onclick = () => { currentSpeaker = n; [...spkRow.children].forEach(x => x.classList.remove('active')); b.classList.add('active'); };
    spkRow.appendChild(b);
  });
  // Tabs
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active')); t.classList.add('active');
    document.querySelectorAll('.tabpane').forEach(p => p.hidden = true);
    $('tab-' + t.dataset.tab).hidden = false;
  });
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) $('browserNote').hidden = false;

  function renderTranscript(interim) {
    const el = $('transcript');
    if (!turns.length && !interim) { el.innerHTML = '<p class="muted">No transcript yet — press “Try demo meeting”, record, upload, or paste.</p>'; $('wordCount').textContent = ''; return; }
    el.innerHTML = turns.map(t => '<p>' + (t.time ? '<span class="ts">[' + esc(t.time) + ']</span> ' : '') + '<span class="spk">' + esc(t.speaker) + ':</span> ' + esc(t.text) + '</p>').join('') + (interim ? '<p><em>' + esc(interim) + '</em></p>' : '');
    el.scrollTop = el.scrollHeight;
    $('wordCount').textContent = '· ' + turns.reduce((a, t) => a + t.text.split(/\s+/).length, 0) + ' words · ' + turns.length + ' turns';
  }
  function loadText(text, isVtt) {
    turns = isVtt ? parseVttSrt(text) : parseLines(text);
    renderTranscript();
    $('analyseMsg').textContent = turns.length ? turns.length + ' turns loaded. Press “Generate insights”.' : 'Could not parse that text — use “Speaker: words” lines.';
  }
  function doAnalyse() {
    if (!turns.length) { $('analyseMsg').textContent = 'Load the demo, record, upload or paste a transcript first.'; return; }
    const t0 = performance.now();
    const a = analyse(turns); lastAnalysis = a;
    const ms = Math.round(performance.now() - t0);
    $('emptyState').hidden = true; $('results').hidden = false;
    $('stats').innerHTML = ['Words|' + a.stats.words, 'Turns|' + a.stats.turns, 'Speakers|' + a.stats.speakers, 'Analysed in|' + ms + ' ms'].map(x => { const [k, v] = x.split('|'); return '<div class="stat"><b>' + esc(v) + '</b><span>' + esc(k) + '</span></div>'; }).join('');
    $('summary').textContent = a.summary;
    $('actionCount').textContent = '(' + a.actions.length + ')';
    $('actions').innerHTML = a.actions.length ? a.actions.map(x => '<li><span class="owner">' + esc(x.owner || 'Unassigned') + '</span>' + (x.due ? '<span class="due">by ' + esc(x.due) + '</span>' : '') + '<br>' + esc(x.text) + '</li>').join('') : '<li>No action items detected — try a transcript with “will / should / need to”.</li>';
    $('decisions').innerHTML = a.decisions.length ? a.decisions.map(d => '<li>✓ ' + esc(d) + '</li>').join('') : '<li>No explicit decisions detected.</li>';
    $('speakers').innerHTML = a.speakers.map(s => '<div class="spk-row"><span>' + esc(s.name) + '</span><div class="bar"><i style="width:' + s.share + '%"></i></div><span>' + s.share + '%</span></div>').join('');
    $('timeline').innerHTML = a.timeline.map(t => '<li><span class="t">' + esc(t.label) + '</span><span><strong>' + esc(t.speaker) + ':</strong> ' + esc(t.text) + '</span></li>').join('');
    const maxK = a.keywords[0] ? a.keywords[0].count : 1;
    $('keywords').innerHTML = a.keywords.map(k => '<span class="kw" style="font-size:' + (12 + Math.round(k.count / maxK * 8)) + 'px">' + esc(k.word) + ' ×' + k.count + '</span>').join('');
    $('analyseMsg').textContent = 'Done in ' + ms + ' ms — locally, no data sent anywhere.';
  }
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  $('demoBtn').onclick = () => { loadText(DEMO_TRANSCRIPT, false); doAnalyse(); };
  $('sampleBtn').onclick = () => loadText(DEMO_TRANSCRIPT, false);
  $('analyseBtn').onclick = doAnalyse;
  $('clearBtn').onclick = () => { turns = []; lastAnalysis = null; $('pasteBox').value = ''; $('results').hidden = true; $('emptyState').hidden = false; renderTranscript(); };
  $('pasteBtn').onclick = () => loadText($('pasteBox').value, false);
  $('exportMdBtn').onclick = () => { if (!lastAnalysis) { doAnalyse(); if (!lastAnalysis) return; } download('meeting-insights.md', toMarkdown('Meeting Insights', turns, lastAnalysis), 'text/markdown'); };
  $('exportTxtBtn').onclick = () => { if (!lastAnalysis) { doAnalyse(); if (!lastAnalysis) return; } download('meeting-insights.txt', toMarkdown('Meeting Insights', turns, lastAnalysis).replace(/[#*`]/g, ''), 'text/plain'); };

  // Upload
  const dz = $('dropZone'), fi = $('fileInput');
  dz.onclick = () => fi.click();
  dz.ondragover = e => { e.preventDefault(); dz.style.borderColor = '#7c8cff'; };
  dz.ondrop = e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
  fi.onchange = () => { if (fi.files[0]) handleFile(fi.files[0]); };
  function handleFile(f) {
    $('fileInfo').textContent = f.name + ' · ' + Math.round(f.size / 1024) + ' KB';
    if (/\.(txt|vtt|srt|md)$/i.test(f.name)) {
      const r = new FileReader(); r.onload = () => loadText(r.result, /\.(vtt|srt)$/i.test(f.name)); r.readAsText(f);
    } else {
      const url = URL.createObjectURL(f); const ap = $('audioPlayer'); ap.src = url; ap.hidden = false;
      $('fileInfo').textContent += ' — audio loaded. Press play, then “Start recording” to dictate it live (Web Speech API), or paste its transcript in the Paste tab.';
    }
  }
  // Live recording
  let rec = null, recOn = false;
  $('recBtn').onclick = () => {
    if (!SR) { alert('Live recording needs Chrome / Edge (Web Speech API). Use Demo or Paste in this browser.'); return; }
    rec = new SR(); rec.lang = 'en-IN'; rec.interimResults = true; rec.continuous = true;
    rec.onresult = e => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) final += e.results[i][0].transcript; else interim += e.results[i][0].transcript; }
      if (final.trim()) { turns.push({ time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), speaker: currentSpeaker, text: final.trim() }); renderTranscript(interim); }
      else renderTranscript(interim);
    };
    rec.onerror = e => { $('recStatus').textContent = 'Mic error: ' + e.error + ' — try Demo / Paste.'; };
    rec.onend = () => { if (recOn) { try { rec.start(); } catch (_) {} } };
    rec.start(); recOn = true;
    $('recBtn').disabled = true; $('stopRecBtn').disabled = false;
    $('recStatus').textContent = '● Recording… speaker: ' + currentSpeaker; $('recStatus').classList.add('live');
  };
  $('stopRecBtn').onclick = () => { recOn = false; if (rec) rec.stop(); $('recBtn').disabled = false; $('stopRecBtn').disabled = true; $('recStatus').textContent = 'Stopped — ' + turns.length + ' turns captured.'; $('recStatus').classList.remove('live'); renderTranscript(); };
  renderTranscript();
}
