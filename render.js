// JSON 레슨 콘텐츠 → 디자인별(A/B/C) HTML 빌드.
// 콘텐츠는 lessons/*.json에서, 스타일은 styles/all-designs.css에서 그대로 가져다 씀 — 여기선 마크업만 생성한다.
// 사용법: node render.js --design a|b|c --track jeondae|daehak
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const LESSONS_DIR = path.join(ROOT, 'lessons');
const BUILD_DIR = path.join(ROOT, 'build');

const DESIGN_LABEL = { a: 'NCS형', b: '메이커형', c: '하이브리드형' };
const TRACK_LABEL = { jeondae: '대학', daehak: '대학교' };

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--design') out.design = args[++i];
    if (args[i] === '--track') out.track = args[++i];
  }
  if (!out.design || !DESIGN_LABEL[out.design]) {
    throw new Error('--design a|b|c 를 지정하세요');
  }
  if (!out.track || !TRACK_LABEL[out.track]) {
    throw new Error('--track jeondae|daehak 를 지정하세요');
  }
  return out;
}

function loadLessons(track) {
  const files = fs.readdirSync(LESSONS_DIR).filter(f => f.endsWith('.json'));
  const lessons = files.map(f => JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, f), 'utf8')));
  lessons.sort((a, b) => a.sortOrder - b.sortOrder);
  return lessons.filter(l => (l.tracks || []).includes(track));
}

function tableHtml(t, opts) {
  if (!t) return '';
  opts = opts || {};
  const cls = opts.recordStyle ? ' class="record-table"' : '';
  const head = t.headers.map(h => `<th>${h}</th>`).join('');
  const rows = t.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
  return `<table${cls}><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

function liList(items) {
  return `<ul>${(items || []).map(i => `<li>${i}</li>`).join('')}</ul>`;
}

// 대학교 트랙에서만 노출되는 심화 이론 블록. lesson.theoryDeepDive가 없으면(=이 레슨엔 추가할 이론이 없으면) 아무것도 렌더링하지 않는다.
function theoryHtml(lesson, track) {
  if (track !== 'daehak' || !lesson.theoryDeepDive) return '';
  const { title, content } = lesson.theoryDeepDive;
  return `<div class="theory-deepdive"><h3>🎓 ${title}</h3>${content.map(p => `<p>${p}</p>`).join('')}</div>`;
}

// 선수지식 링크 — 트랙 무관(대학·대학교 모두 노출). POLICY.md 3절: 초점 정확도 필수, focus 텍스트로 명시.
function prereqItems(lesson) {
  if (!(lesson.prerequisites || []).length) return '';
  return `<ul class="prereq-list">${lesson.prerequisites.map(p =>
    `<li><a href="${p.url}" target="_blank" rel="noopener">${p.topic}</a><br><span class="prereq-focus">${p.focus}</span> <span class="prereq-source">— ${p.source}</span></li>`
  ).join('')}</ul>`;
}
function prereqHtml(lesson) {
  const items = prereqItems(lesson);
  return items ? `<div class="prereq-links"><h3>📚 선수지식 — 막히면 여기부터</h3>${items}</div>` : '';
}

// ============ DESIGN A — NCS 학습모듈 양식 ============
function renderLessonA(lesson, track) {
  let n = 0;
  const sec = (title, bodyHtml) => {
    n++;
    return `<section><div class="a-sec-title"><span class="a-num">${n}</span>${title}</div>${bodyHtml}</section>`;
  };

  const sections = [];
  sections.push(sec('학습목표', liList(lesson.objectives)));
  sections.push(sec('필요지식', liList(lesson.knowledge)));
  if ((lesson.prerequisites || []).length) sections.push(sec('선수지식 더 보기', prereqItems(lesson)));

  const materialsHtml = Object.entries(lesson.materials || {})
    .map(([k, v]) => `<div class="a-box"><b>${k}</b>${v}</div>`).join('');
  const safetyHtml = (lesson.safety || []).length
    ? `<div class="a-warn"><b>안전·유의사항</b><ol>${lesson.safety.map(s => `<li>${s}</li>`).join('')}</ol></div>` : '';
  const procHtml = lesson.procedure ? tableHtml(lesson.procedure) : '';
  const codeHtml = lesson.code ? `<div class="code-block">${lesson.code}</div>` : '';
  const tipHtml = lesson.codeTip ? `<p style="font-size:.82rem; color:var(--a-muted); margin-top:10px;">${lesson.codeTip}</p>` : '';
  sections.push(sec('수행내용', `<div class="a-subgrid">${materialsHtml}</div>${safetyHtml}${procHtml}${codeHtml}${tipHtml}`));

  if (lesson.recordTable) {
    const noteHtml = lesson.recordNote
      ? `<div><span class="record-note-label">종합 소견</span><textarea class="record-note" placeholder="${lesson.recordNote}"></textarea></div>` : '';
    sections.push(sec('실습 결과 기록', `<div class="record-block">${tableHtml(lesson.recordTable, { recordStyle: true })}${noteHtml}</div>`));
  }

  if (lesson.evaluation) sections.push(sec('평가', tableHtml(lesson.evaluation)));
  if ((lesson.advanced || []).length) sections.push(sec('심화 개념', liList(lesson.advanced)));
  if (lesson.troubleshooting) sections.push(sec('트러블슈팅', tableHtml(lesson.troubleshooting)));
  if (lesson.checkQuestions) sections.push(sec('개념 확인', tableHtml(lesson.checkQuestions, { recordStyle: true })));
  if (lesson.advancedTask) sections.push(sec('심화 과제', `<p style="font-size:.88rem; line-height:1.7;">${lesson.advancedTask}</p>`));
  if (track === 'daehak' && lesson.theoryDeepDive) sections.push(sec(lesson.theoryDeepDive.title + ' (대학교 심화)', lesson.theoryDeepDive.content.map(p => `<p style="font-size:.88rem; line-height:1.7;">${p}</p>`).join('')));

  const photo = lesson.photoBlockHtml || '';

  return `<div class="mockup active" id="lesson-${lesson.id}"><div class="page-frame"><div class="design-a">
    <div class="a-band"><div class="a-kicker">NCS 학습모듈 양식 · 자체 개발 교재</div><h1>${lesson.title}</h1></div>
    <div class="a-meta">
      <div><b>학습모듈명</b>${lesson.moduleName}</div>
      <div><b>훈련시간</b>${lesson.moduleTime}</div>
      <div><b>선수 학습</b>${lesson.prereq || '없음'}</div>
    </div>
    <div class="a-body">${photo}${sections.join('')}</div>
    <div class="a-footprint"><span>SV로보틱스 · ROSOrin Pro 교재 개발</span><span>${lesson.id}</span></div>
  </div></div></div>`;
}

// ============ DESIGN B — 메이커형 ============
function renderLessonB(lesson, track) {
  const chips = [`⏱ ${lesson.moduleTime}`];
  if (lesson.prereq) chips.push(`선수: ${lesson.prereq}`);

  const photo = lesson.photoBlockHtml || '';
  const callout = (lesson.safety || []).length
    ? `<div class="b-callout" style="margin-top:0;"><b>시작 전에.</b> ${lesson.safety[0]}</div>` : '';

  const knowledgeHtml = (lesson.knowledge || []).length
    ? `<div><div class="b-sec-label">필요 지식</div><ul style="margin:0; padding-left:1.2em; line-height:1.85; font-size:.9rem;">${lesson.knowledge.map(k => `<li>${k}</li>`).join('')}</ul></div>` : '';

  const steps = lesson.procedure ? lesson.procedure.rows.map((row, i) => {
    const [, action, criteria] = row;
    return `<div class="b-step"><div class="b-stepnum">${i + 1}</div><div><h3>${action}</h3><p>판정기준: ${criteria}</p></div></div>`;
  }).join('') : '';
  const codeHtml = lesson.code ? `<div class="code-block">${lesson.code}</div>` : '';
  const stepsBlock = (steps || codeHtml)
    ? `<div><div class="b-sec-label">단계별로 따라하기</div>${steps}${codeHtml}</div>` : '';

  const recordBlock = lesson.recordTable
    ? `<div><div class="b-sec-label">결과 기록</div>${tableHtml(lesson.recordTable, { recordStyle: true })}${lesson.recordNote ? `<div style="margin-top:10px;"><span class="record-note-label">한 줄 소감</span><textarea class="record-note" placeholder="${lesson.recordNote}"></textarea></div>` : ''}</div>` : '';

  const checkBlock = (lesson.objectives || []).length
    ? `<div><div class="b-sec-label">완료 체크</div><ul class="b-check">${lesson.objectives.map(o => `<li>${o}</li>`).join('')}</ul></div>` : '';

  const advancedBlock = (lesson.advanced || []).length
    ? `<div><div class="b-sec-label">더 알아두면 좋은 것</div><ul style="margin:0; padding-left:1.2em; line-height:1.85; font-size:.88rem;">${lesson.advanced.map(a => `<li>${a}</li>`).join('')}</ul></div>` : '';

  const fixBlock = lesson.troubleshooting
    ? `<div><div class="b-sec-label">막혔다면 (더보기)</div>${lesson.troubleshooting.rows.map(([symptom, cause, fix]) =>
        `<div class="b-fix" style="margin-top:10px;"><h3>🔧 ${symptom}</h3><p><b>원인:</b> ${cause}<br><b>해결:</b> ${fix}</p></div>`).join('')}</div>` : '';

  const quizBlock = lesson.checkQuestions
    ? `<div><div class="b-sec-label">확인 퀴즈</div><ul style="list-style:none; margin:0; padding:0; font-size:.86rem;">${lesson.checkQuestions.rows.map(([, q]) =>
        `<li style="margin-bottom:8px;">${q} <input type="text" style="margin-left:6px; width:60%;"></li>`).join('')}</ul></div>` : '';

  const askBlock = lesson.advancedTask
    ? `<div class="b-ask"><b>도전 과제.</b> ${lesson.advancedTask}</div>` : '';

  const theoryBlock = theoryHtml(lesson, track);
  const prereqBlock = prereqHtml(lesson);

  return `<div class="mockup active" id="lesson-${lesson.id}"><div class="page-frame"><div class="design-b">
    <div class="b-hero">
      <div class="b-step-badge">STEP ${lesson.id}</div>
      <h1>${lesson.title}</h1>
      <div class="b-meta-row">${chips.map(c => `<span class="b-chip">${c}</span>`).join('')}</div>
    </div>
    <div class="b-body">${photo}${callout}${knowledgeHtml}${prereqBlock}${stepsBlock}${recordBlock}${checkBlock}${advancedBlock}${fixBlock}${quizBlock}${askBlock}${theoryBlock}</div>
    <div class="b-footer"><span>SV로보틱스 · ROSOrin Pro 교재 개발</span><span>${lesson.id}</span></div>
  </div></div></div>`;
}

// ============ DESIGN C — 하이브리드형 ============
function renderLessonC(lesson, track) {
  const photo = lesson.photoBlockHtml || '';
  const moduleCode = (lesson.id || '').split('-')[0];

  const goalsCard = `<div class="c-card"><div class="c-sec-head"><h2>이 레슨이 끝나면</h2></div><ul class="c-goals">${(lesson.objectives || []).map(o => `<li>${o}</li>`).join('')}</ul></div>`;

  const chips = Object.values(lesson.materials || {}).map(v => `<span class="c-chip">${v}</span>`).join('');
  const materialsCard = chips
    ? `<div class="c-card"><div class="c-sec-head"><h2>준비물</h2></div><div class="c-chips">${chips}</div></div>` : '';

  const safetyCard = (lesson.safety || []).length
    ? `<div class="c-safety"><h2>⚠ 안전 유의사항</h2><ul>${lesson.safety.map(s => `<li>${s}</li>`).join('')}</ul></div>` : '';

  const steps = lesson.procedure ? lesson.procedure.rows.map((row, i) => {
    const [, action, criteria] = row;
    return `<div class="c-step"><div class="c-dot">${i + 1}</div><div><h3>${action}</h3><p>${criteria}</p></div></div>`;
  }).join('') : '';
  const codeHtml = lesson.code ? `<div class="code-block">${lesson.code}</div>` : '';
  const procCard = (steps || codeHtml)
    ? `<div class="c-card"><div class="c-sec-head"><h2>수행 순서</h2></div><div class="c-steps">${steps}</div>${codeHtml}</div>` : '';

  const recordCard = lesson.recordTable
    ? `<div class="c-card"><div class="c-sec-head"><h2>실습 기록</h2></div><div class="record-block">${tableHtml(lesson.recordTable, { recordStyle: true })}${lesson.recordNote ? `<div><span class="record-note-label">종합 소견</span><textarea class="record-note" placeholder="${lesson.recordNote}"></textarea></div>` : ''}</div></div>` : '';

  const evalCard = lesson.evaluation
    ? `<div class="c-card c-eval"><div class="c-sec-head"><h2>자가 점검</h2></div>${tableHtml(lesson.evaluation)}</div>` : '';

  const advancedCard = (lesson.advanced || []).length
    ? `<div class="c-card"><div class="c-sec-head"><h2>심화 개념</h2></div><ul style="margin:0; padding-left:1.2em; line-height:1.85; font-size:.9rem; list-style:disc;">${lesson.advanced.map(a => `<li>${a}</li>`).join('')}</ul></div>` : '';

  const troubleCard = lesson.troubleshooting
    ? `<div class="c-card"><div class="c-sec-head"><h2>트러블슈팅</h2></div>${tableHtml(lesson.troubleshooting)}</div>` : '';

  const checkCard = lesson.checkQuestions
    ? `<div class="c-card"><div class="c-sec-head"><h2>개념 확인</h2></div>${tableHtml(lesson.checkQuestions, { recordStyle: true })}</div>` : '';

  const noteCard = lesson.advancedTask
    ? `<div class="c-note"><b>심화 과제</b> — ${lesson.advancedTask}</div>` : '';

  const theoryBlock = theoryHtml(lesson, track);
  const prereqCard = (lesson.prerequisites || []).length
    ? `<div class="c-card"><div class="c-sec-head"><h2>선수지식 더 보기</h2></div>${prereqItems(lesson)}</div>` : '';

  return `<div class="mockup active" id="lesson-${lesson.id}"><div class="page-frame"><div class="design-c">
    <div class="c-top"><div class="c-kicker">${moduleCode} · ${lesson.moduleName}</div><h1>${lesson.title}</h1></div>
    <div class="c-body">${photo}${goalsCard}${materialsCard}${prereqCard}${safetyCard}${procCard}${recordCard}${evalCard}${advancedCard}${troubleCard}${checkCard}${noteCard}${theoryBlock}</div>
    <div class="c-footer"><span>SV로보틱스 · ROSOrin Pro 교재 개발</span><span>${lesson.id}</span></div>
  </div></div></div>`;
}

const RENDERERS = { a: renderLessonA, b: renderLessonB, c: renderLessonC };

// 목차 항목 하나(아코디언으로 펼쳐질 때 보이는 요약) 텍스트 생성
function tocSummary(lesson) {
  const parts = [`⏱ ${lesson.moduleTime}`];
  if (lesson.prereq) parts.push(`선수: ${lesson.prereq}`);
  if ((lesson.objectives || [])[0]) parts.push(lesson.objectives[0].replace(/<[^>]+>/g, ''));
  return parts.join(' · ');
}

function buildPage(design, track, lessons) {
  const render = RENDERERS[design];
  const shortTitle = l => l.title.split(' — ')[0].replace(/^\d[\d.-]*\.?\s*/, '');
  const toc = lessons.map(l => `<li><b>${l.id}</b> — ${shortTitle(l)}</li>`).join('');
  const lessonsHtml = lessons.map(l => render(l, track)).join('\n');

  // 플로팅 목차 버튼용 데이터 — id/제목/요약만 담아 가볍게 유지
  const tocData = lessons.map(l => ({ id: l.id, title: shortTitle(l), summary: tocSummary(l) }));
  const tocFloatItems = tocData.map((l, i) =>
    `<li><button type="button" class="toc-float-q" data-idx="${i}">${l.id} — ${l.title}</button>
      <div class="toc-float-a" id="toc-float-a-${i}">
        <p>${l.summary}</p>
        <button type="button" class="toc-float-jump" data-target="lesson-${l.id}">바로가기 →</button>
      </div>
    </li>`).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>ROSOrin Pro 교재 — ${DESIGN_LABEL[design]} · ${TRACK_LABEL[track]}</title>
<link rel="stylesheet" href="../styles/all-designs.css">
<style>
  .cover{ max-width:820px; margin:0 auto; padding:80px 24px; text-align:center; }
  .cover h1{ font-size:1.8rem; margin-bottom:8px; }
  .cover p{ color:var(--shell-muted); }
  .toc{ max-width:820px; margin:0 auto 40px; padding:0 24px; }
  .toc ul{ line-height:2.1; padding-left:1.4em; }
  @media print{ .cover, .toc{ break-after:page; } }
  /* 정적 출력물이므로 인터랙티브 프로토타입의 페이드인 애니메이션은 끈다 —
     헤드리스 Chrome이 PDF를 찍는 시점이 .2s reveal 애니메이션 도중과 겹쳐
     본문이 저opacity 상태로 캡처되는 문제가 있었음(전체 텍스트가 흐릿하게 인쇄됨) */
  .mockup, .mockup.active{ animation:none !important; opacity:1 !important; transform:none !important; }
  /* 대학교 트랙 전용 심화 이론 블록 — 디자인 B/C에서 쓰는 범용 박스(디자인 A는 자체 섹션 문법을 그대로 재사용) */
  .theory-deepdive{ margin-top:18px; padding:16px 18px; border:1px dashed #7a5cff; border-radius:8px; background:rgba(122,92,255,.06); }
  .theory-deepdive h3{ margin:0 0 8px; font-size:.92rem; color:#5b3fd9; }
  .theory-deepdive p{ margin:0 0 8px; font-size:.88rem; line-height:1.7; }
  .theory-deepdive p:last-child{ margin-bottom:0; }
  @media print{ .theory-deepdive{ border-color:#5b3fd9 !important; background:#f5f2ff !important; break-inside:avoid; } .theory-deepdive h3{ color:#5b3fd9 !important; } }

  /* 선수지식 링크 — 트랙 무관(대학·대학교 모두 노출) */
  .prereq-links{ margin-top:18px; padding:14px 16px; border:1px dashed #1a8a6a; border-radius:8px; background:rgba(26,138,106,.06); }
  .prereq-links h3{ margin:0 0 8px; font-size:.88rem; color:#0f6b4f; }
  .prereq-list{ margin:0; padding-left:1.2em; font-size:.86rem; line-height:1.6; }
  .prereq-list li{ margin-bottom:10px; }
  .prereq-list a{ font-weight:600; }
  .prereq-focus{ display:block; color:var(--shell-muted, #666e79); font-size:.82rem; margin-top:2px; }
  .prereq-source{ color:var(--shell-muted, #666e79); font-size:.78rem; }
  @media print{ .prereq-links{ border-color:#0f6b4f !important; background:#eefaf5 !important; break-inside:avoid; } .prereq-links h3{ color:#0f6b4f !important; } }

  /* 화면 전용 플로팅 목차 — 스크롤해도 항상 보이고, 인쇄 시에는 완전히 숨김 */
  .toc-float-btn{
    position:fixed; right:22px; bottom:22px; z-index:9999;
    width:56px; height:56px; border-radius:50%; border:none; cursor:pointer;
    background:var(--shell-accent, #3a5a8c); color:#fff; font-size:.72rem; font-weight:700;
    box-shadow:0 4px 16px rgba(0,0,0,.28); display:flex; align-items:center; justify-content:center; line-height:1.2;
  }
  .toc-float-btn:hover{ filter:brightness(1.08); }
  .toc-float-panel{
    position:fixed; right:22px; bottom:88px; z-index:9999;
    width:min(380px, calc(100vw - 44px)); max-height:70vh; overflow-y:auto;
    background:var(--shell-surface, #fff); color:var(--shell-ink, #1c2024);
    border:1px solid var(--shell-line, #d8dce2); border-radius:12px;
    box-shadow:0 8px 32px rgba(0,0,0,.28); padding:10px;
  }
  .toc-float-panel[hidden]{ display:none !important; }
  .toc-float-panel h3{ margin:4px 8px 8px; font-size:.9rem; }
  .toc-float-panel ul{ list-style:none; margin:0; padding:0; }
  .toc-float-panel li{ border-bottom:1px solid var(--shell-line, #e5e7eb); }
  .toc-float-panel li:last-child{ border-bottom:none; }
  .toc-float-q{
    width:100%; text-align:left; background:none; border:none; cursor:pointer;
    padding:10px 8px; font-size:.84rem; color:inherit; font-family:inherit;
  }
  .toc-float-q:hover{ background:rgba(58,90,140,.08); }
  .toc-float-q.is-open{ font-weight:700; color:var(--shell-accent, #3a5a8c); }
  .toc-float-a{ display:none; padding:0 8px 12px; }
  .toc-float-a.is-open{ display:block; }
  .toc-float-a p{ margin:0 0 8px; font-size:.78rem; line-height:1.6; color:var(--shell-muted, #666e79); }
  .toc-float-jump{
    border:1px solid var(--shell-accent, #3a5a8c); color:var(--shell-accent, #3a5a8c); background:none;
    border-radius:6px; padding:5px 10px; font-size:.78rem; cursor:pointer; font-family:inherit;
  }
  .toc-float-jump:hover{ background:var(--shell-accent, #3a5a8c); color:#fff; }
  @media print{ .toc-float-btn, .toc-float-panel{ display:none !important; } }
</style>
</head>
<body>
<div class="shell"><div class="stage">
  <div class="cover"><h1>ROSOrin Pro 활용 자율주행 로봇 프로그래밍</h1><p>디자인: ${DESIGN_LABEL[design]} · 트랙: ${TRACK_LABEL[track]}</p><p>SV로보틱스</p></div>
  <div class="toc"><h2>목차</h2><ul>${toc}</ul></div>
  ${lessonsHtml}
</div></div>

<button type="button" class="toc-float-btn" id="tocFloatBtn">목차</button>
<div class="toc-float-panel" id="tocFloatPanel" hidden>
  <h3>목차 — 눌러서 요약 보기</h3>
  <ul>${tocFloatItems}</ul>
</div>
<script>
(function(){
  var btn = document.getElementById('tocFloatBtn');
  var panel = document.getElementById('tocFloatPanel');
  btn.addEventListener('click', function(){ panel.hidden = !panel.hidden; });

  var openIdx = null;
  document.querySelectorAll('.toc-float-q').forEach(function(q){
    q.addEventListener('click', function(){
      var idx = q.dataset.idx;
      var answer = document.getElementById('toc-float-a-' + idx);
      var wasOpen = q.classList.contains('is-open');
      // 하나만 열려 있도록 — 새 항목을 누르면 이전 항목은 닫힘
      document.querySelectorAll('.toc-float-q.is-open').forEach(function(o){ o.classList.remove('is-open'); });
      document.querySelectorAll('.toc-float-a.is-open').forEach(function(o){ o.classList.remove('is-open'); });
      if (!wasOpen){
        q.classList.add('is-open');
        answer.classList.add('is-open');
        openIdx = idx;
      } else {
        openIdx = null;
      }
    });
  });

  document.querySelectorAll('.toc-float-jump').forEach(function(j){
    j.addEventListener('click', function(){
      var target = document.getElementById(j.dataset.target);
      if (target){ target.scrollIntoView({ behavior:'smooth', block:'start' }); }
      panel.hidden = true;   // 이동 후 패널은 닫되, 플로팅 버튼 자체는 항상 화면에 남아있음
    });
  });
})();
</script>
</body>
</html>`;
}

function main() {
  const { design, track } = parseArgs();
  const lessons = loadLessons(track);
  if (!lessons.length) throw new Error(`트랙 "${track}"에 속하는 레슨이 없습니다`);
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  const html = buildPage(design, track, lessons);
  const outPath = path.join(BUILD_DIR, `build_${design}_${track}.html`);
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`wrote ${outPath}  (${lessons.length} lessons)`);
}

main();
