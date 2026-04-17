/* ==============================
   Shared Test Framework Core
   ============================== */

let currentQuestion = 0;
let answers = {};  // { questionId: selectedOptionIndex }
let scores = {};   // { personalityKey: totalScore } OR 'total' for aggregate tests
const RESULT_VIEW_TABLE = 'result_views';

// 获取 Supabase 客户端
function getAppSupabaseClient() {
  if (window.supabaseClient && typeof window.supabaseClient.from === 'function') return window.supabaseClient;
  if (window.db && typeof window.db.from === 'function') return window.db;
  if (typeof supabase !== 'undefined' && supabase && typeof supabase.from === 'function') return supabase;
  return null;
}

// 获取页面类型 (soullab / objtest)
function getPageType() {
  const container = document.getElementById('comments-section');
  return container?.getAttribute('data-page') || 'soullab';
}

// 获取显示昵称
function getDisplayNickname() {
  return (typeof currentProfile !== 'undefined' ? currentProfile?.nickname : '')
    || (typeof currentUser !== 'undefined' ? currentUser?.user_metadata?.nickname : '')
    || (typeof currentUser !== 'undefined' ? currentUser?.email : '')
    || '';
}

/* ==============================
   Participant Count Logic
   ============================== */
function renderParticipantCount(element, count) {
  if (!element) return;
  const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Math.floor(Number(count))) : 0;
  element.innerHTML = `已有 <span class="participant-number">${safeCount}</span> 人参与测试`;
}

async function loadParticipantCount() {
  const client = getAppSupabaseClient();
  const pageType = getPageType();
  const countElId = `${pageType}-participant-count`;
  const countEl = document.getElementById(countElId);
  if (!client || !countEl) return;

  try {
    let count = 0;
    const resultViewRes = await client
      .from(RESULT_VIEW_TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('page_type', pageType);

    if (resultViewRes.error) {
      const commentRes = await client
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('page_type', pageType);
      if (commentRes.error) throw commentRes.error;
      count = commentRes.count || 0;
    } else {
      count = resultViewRes.count || 0;
    }
    renderParticipantCount(countEl, count);
  } catch (err) {
    console.error('加载参与人数失败:', err);
  }
}

async function trackResultView() {
  const client = getAppSupabaseClient();
  const pageType = getPageType();
  if (!client) return;
  try {
    await client.from(RESULT_VIEW_TABLE).insert({ page_type: pageType });
    loadParticipantCount();
  } catch (err) {
    console.error('记录结果浏览失败:', err);
  }
}

/* ==============================
   Page Management
   ============================== */
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
    page.style.display = 'none';
  });
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.style.display = (pageId === 'quiz' || pageId === 'loading') ? 'flex' : 'block';
    targetPage.offsetHeight;
    targetPage.classList.add('active');
  }

  document.body.classList.remove('landing-active', 'result-active', 'quiz-active');
  if (pageId === 'landing') document.body.classList.add('landing-active');
  if (pageId === 'quiz') document.body.classList.add('quiz-active');
  if (pageId === 'result') document.body.classList.add('result-active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ==============================
   Quiz Core Logic
   ============================== */
function startTest() {
  currentQuestion = 0;
  answers = {};
  scores = {};
  showPage('quiz');
  renderQuestion();
}

function renderQuestion() {
  const q = questions[currentQuestion];
  const container = document.getElementById('question-container');
  if (!container) return;

  container.style.opacity = '0';
  container.style.transform = 'translateY(10px)';

  setTimeout(() => {
    container.innerHTML = `
      <h2 class="question-number">Question ${currentQuestion + 1}</h2>
      <p class="question-text">${q.text}</p>
      <div class="options">
        ${q.options.map((opt, idx) => `
          <div class="option ${answers[q.id] === idx ? 'selected' : ''}" onclick="selectOption(${idx})">
            <div class="option-indicator"></div>
            <span class="option-label">${String.fromCharCode(65 + idx)}</span>
            <span class="option-text">${opt.text}</span>
          </div>
        `).join('')}
      </div>
    `;
    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';
    updateProgress();
  }, 300);
}

function selectOption(idx) {
  const q = questions[currentQuestion];
  answers[q.id] = idx;

  const options = document.querySelectorAll('.option');
  options.forEach(opt => opt.classList.remove('selected'));
  options[idx].classList.add('selected');

  setTimeout(() => {
    if (currentQuestion < questions.length - 1) {
      currentQuestion++;
      renderQuestion();
    } else {
      calculateResult();
    }
  }, 400);
}

function prevQuestion() {
  if (currentQuestion > 0) {
    currentQuestion--;
    renderQuestion();
  }
}

function nextQuestion() {
  if (currentQuestion < questions.length - 1) {
    currentQuestion++;
    renderQuestion();
  } else if (answers[questions[currentQuestion].id] !== undefined) {
    calculateResult();
  }
}

function updateProgress() {
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const bar = document.getElementById('progress-bar');
  const currentQ = document.getElementById('current-q');
  const totalQ = document.getElementById('total-q');

  if (bar) bar.style.width = `${progress}%`;
  if (currentQ) currentQ.textContent = currentQuestion + 1;
  if (totalQ) totalQ.textContent = questions.length;
}

/* ==============================
   Result Calculation
   ============================== */
async function calculateResult() {
  const pageType = getPageType();
  showPage('loading');

  const progressTitle = document.querySelector('.loading-title');
  const messages = pageType === 'soullab'
    ? ["分析潜意识流...", "解构现实编码...", "生成觉醒画像..."]
    : ["正在收集数据...", "分析认知偏差...", "评估主体状态...", "生成系统结论..."];

  let i = 0;
  const interval = setInterval(() => {
    if (progressTitle && messages[i]) progressTitle.textContent = messages[i];
    i++;
    if (i >= messages.length) clearInterval(interval);
  }, 800);

  if (pageType === 'soullab') {
    scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
    questions.forEach(q => {
      const selectedIdx = answers[q.id];
      if (selectedIdx !== undefined) {
        const optionScores = q.options[selectedIdx].scores;
        for (let key in optionScores) {
          scores[key] = (scores[key] || 0) + optionScores[key];
        }
      }
    });

    const personalityMapping = {
      'mask': (s) => s.E >= s.I && s.J >= s.P,
      'hoard': (s) => s.I >= s.E && s.T >= s.F && s.J >= s.P,
      'escape': (s) => s.I >= s.E && s.F >= s.T && s.P >= s.J,
      'rebel': (s) => s.E >= s.I && s.P >= s.J && s.T >= s.F,
      'edge': (s) => s.I >= s.E && s.F >= s.T && s.J >= s.P,
      'crash': (s) => s.N >= s.S && s.P >= s.J && s.F >= s.T,
      'chill': (s) => s.I >= s.E && s.S >= s.N && s.P >= s.J,
      'clown': (s) => s.E >= s.I && s.S >= s.N && s.P >= s.J,
      'mama': (s) => s.E >= s.I && s.F >= s.T && s.J >= s.P,
      'hustle': (s) => s.S >= s.N && s.T >= s.F && s.J >= s.P,
      'chaos': (s) => s.E >= s.I && s.P >= s.J && s.S >= s.N,
      'awake': (s) => s.N >= s.S && s.P >= s.J && s.T >= s.F
    };

    let resultKey = 'edge';
    for (const [key, check] of Object.entries(personalityMapping)) {
      if (check(scores)) {
        resultKey = key;
        break;
      }
    }
    setTimeout(() => finalizeResult(resultKey), 3500);
  } else {
    let totalScore = 0;
    questions.forEach(q => {
      const selectedIdx = answers[q.id];
      if (selectedIdx !== undefined) {
        totalScore += (q.options[selectedIdx].score || 0);
      }
    });
    setTimeout(() => finalizeResult(totalScore), 3500);
  }
}

function finalizeResult(resultValue) {
  const pageType = getPageType();
  showPage('result');
  trackResultView();

  if (pageType === 'soullab') {
    displaySoulLabResult(resultValue);
  } else {
    displayObjTestResult(resultValue);
  }

  if (window.initComments) window.initComments();
}

/* ==============================
   UI Helpers & Result Display
   ============================== */
function displaySoulLabResult(type) {
  const dataStore = (typeof personalities !== 'undefined') ? personalities : (typeof personalityTypes !== 'undefined' ? personalityTypes : {});
  const p = dataStore[type];
  if (!p) return;

  const nickname = getDisplayNickname();
  const typeLabel = document.getElementById('result-type-label');
  if (typeLabel) typeLabel.textContent = nickname ? `${nickname}的人格` : '你的人格类型是';

  document.getElementById('result-badge').textContent = p.emoji || '🎭';
  document.getElementById('result-title').textContent = p.name;
  document.getElementById('result-subtitle').textContent = p.subtitle || p.tagline || '';
  document.getElementById('result-description').innerHTML = p.description;
  document.getElementById('result-quote').textContent = p.quote || '';
  document.getElementById('result-mbti').innerHTML = p.mbti || '';

  const charImg = document.getElementById('character-img');
  if (charImg && p.image) {
    charImg.src = p.image + "?t=" + new Date().getTime();
    charImg.style.cursor = 'zoom-in';
    charImg.onclick = () => openImageModal(charImg.src);
  }

  const tagsContainer = document.getElementById('result-tags');
  if (tagsContainer) {
    const tags = p.tags || (p.traits ? [...p.traits, ...(p.weaknesses || [])] : []);
    tagsContainer.innerHTML = tags.map(t => `<span class="result-tag">#${t}</span>`).join('');
  }

  setTimeout(() => {
    if (p.meters) {
       animateMeter('meter-mask', p.meters.mask || 50);
       animateMeter('meter-awake', p.meters.awake || 50);
       animateMeter('meter-chill', p.meters.chill || 50);
       animateMeter('meter-drama', p.meters.drama || 50);
    }
  }, 300);
}

function displayObjTestResult(score) {
  const tier = resultTiers.find(t => score >= t.minScore && score <= t.maxScore) || resultTiers[0];
  const resContainer = document.getElementById('result-display');
  if (!resContainer) return;

  resContainer.innerHTML = `
    <div class="result-content">
      <div class="result-header" style="text-align: center; margin-bottom: 40px;">
        <div class="result-score-circle" style="width:110px; height:110px; border-radius:50%; border:3px solid ${tier.color}; display:inline-flex; align-items:center; justify-content:center; font-size:3rem; font-weight:800; color:${tier.color}; margin:0 auto 20px; font-family:var(--font-display); box-shadow: 0 0 30px ${tier.color}33;">${score}</div>
        <div class="result-type-label" style="opacity: 0.6;">ASSESSMENT CONCLUSION</div>
        <div class="result-title-group">
           <h2 class="result-title" id="result-title" style="color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; text-shadow: 0 4px 15px rgba(0,0,0,0.6);">${tier.title}</h2>
        </div>
      </div>

      <div class="result-description" style="text-align: center; line-height: 2; margin-bottom: 35px; background: rgba(255,255,255,0.02); padding: 25px; border-radius: var(--radius-lg); border: 1px solid rgba(255,255,255,0.08); box-shadow: inset 0 0 20px rgba(255,255,255,0.02);">
        <div style="font-size: 0.75rem; color: var(--accent-1); text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 12px; opacity: 0.8;">评估深度结论</div>
        <p style="margin:0; font-size: 1rem; color: var(--text-secondary);">${tier.description}</p>
      </div>

      <div class="result-section" style="margin-bottom: 30px;">
        <h3 class="section-label" style="text-align: center; margin-bottom: 15px;">心理状态解析</h3>
        <p style="text-align: center; font-size: 0.95rem; line-height: 1.8; color: var(--text-secondary);">${tier.psychState}</p>
      </div>

      <div class="result-section" style="margin-bottom: 30px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 30px;">
        <h3 class="section-label" style="text-align: center; margin-bottom: 15px;">觉醒建议</h3>
        <div style="text-align: center; font-size: 0.95rem; line-height: 1.8; color: var(--text-secondary); max-width: 90%; margin: 0 auto;">${tier.advice}</div>
      </div>
    </div>
  `;
}

/* ==============================
   Image Lightbox Logic
   ============================== */
function openImageModal(src) {
  let modal = document.getElementById('image-modal');
  let modalImg = document.getElementById('modal-img');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'image-modal';
    modal.className = 'image-modal';
    modal.innerHTML = '<img id="modal-img" src="" alt="大图" /><div class="modal-close">✕ 关闭</div>';
    modal.onclick = closeImageModal;
    document.body.appendChild(modal);
    modalImg = document.getElementById('modal-img');
  }
  
  modalImg.src = src;
  modal.style.display = 'flex';
  setTimeout(() => {
    modal.style.opacity = '1';
    modal.classList.add('show-img');
  }, 10);
}

function closeImageModal() {
  const modal = document.getElementById('image-modal');
  if (!modal) return;
  modal.style.opacity = '0';
  modal.classList.remove('show-img');
  setTimeout(() => { modal.style.display = 'none'; }, 300);
}

function animateMeter(fillId, value) {
  const fill = document.getElementById(fillId);
  const valEl = document.getElementById(fillId + '-val');
  if (!fill || !valEl) return;
  fill.style.width = value + '%';

  let current = 0;
  const step = value / 30;
  const timer = setInterval(() => {
    current += step;
    if (current >= value) { current = value; clearInterval(timer); }
    valEl.textContent = Math.round(current) + '%';
  }, 30);
}

function restartTest() { window.location.reload(); }

/* ==============================
   Poster Generation Logic (Robust)
   ============================== */
function shareResult() {
  const toast = (typeof showToast === 'function') ? showToast : alert;
  toast('正在生成专属海报，请稍候...');

  if (typeof html2canvas === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => generatePoster();
    script.onerror = () => toast('生成海报组件加载失败');
    document.head.appendChild(script);
  } else {
    generatePoster();
  }
}

function generatePoster() {
  const originalResult = document.querySelector('.result-content');
  const toast = (typeof showToast === 'function') ? showToast : alert;
  if (!originalResult) { toast('未找到结果内容'); return; }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:680px;background:#0a0a1a;padding:0;margin:0;z-index:-1;';

  const clone = originalResult.cloneNode(true);
  ['#comments-section', '.result-actions', '.result-comments-shell', '.modal-close'].forEach(sel => {
    const els = clone.querySelectorAll(sel);
    els.forEach(el => el.remove());
  });

  clone.style.cssText = 'width:680px !important;max-width:680px !important;padding:50px 40px !important;margin:0 !important;box-sizing:border-box !important;background:#0a0a1a !important;display:block !important;';
  
  const titleEls = clone.querySelectorAll('.result-title');
  titleEls.forEach(el => {
    el.style.cssText = 'color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;background:none !important;text-shadow:none !important;display:block !important;text-align:center !important;';
  });

  const wrapperInner = document.createElement('div');
  wrapperInner.style.cssText = 'background:#0a0a1a;padding:10px;';
  wrapperInner.appendChild(clone);
  wrapper.appendChild(wrapperInner);
  document.body.appendChild(wrapper);

  const doCapture = () => {
    html2canvas(wrapperInner, {
      backgroundColor: '#0a0a1a',
      scale: 2,
      useCORS: true,
      allowTaint: false,
      width: 680,
      windowWidth: 680
    }).then(canvas => {
      document.body.removeChild(wrapper);
      const imgData = canvas.toDataURL('image/png');

      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);backdrop-filter:blur(10px);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity 0.3s;';

      const hint = document.createElement('p');
      hint.textContent = '长按图片保存到相册 ✨';
      hint.style.cssText = 'color:white;margin-bottom:15px;font-size:16px;';

      const img = document.createElement('img');
      img.src = imgData;
      img.style.cssText = 'max-width:90%;max-height:75vh;border-radius:12px;box-shadow:0 0 40px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);';

      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕ 关闭海报';
      closeBtn.style.cssText = 'margin-top:20px;padding:12px 35px;background:white;color:black;border:none;border-radius:25px;cursor:pointer;font-weight:bold;';
      closeBtn.onclick = () => { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 300); };

      overlay.append(hint, img, closeBtn);
      document.body.appendChild(overlay);
      setTimeout(() => overlay.style.opacity = '1', 50);
      toast('生成完毕！');
    }).catch(err => {
      if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
      toast('生成失败，请重试');
    });
  };

  const img = clone.querySelector('#character-img');
  if (img && img.src && !img.src.startsWith('data:')) {
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.src = img.src.split('?')[0] + '?t=' + Date.now();
    tempImg.onload = () => {
      const c = document.createElement('canvas');
      c.width = tempImg.naturalWidth; c.height = tempImg.naturalHeight;
      c.getContext('2d').drawImage(tempImg, 0, 0);
      try { img.src = c.toDataURL('image/png'); } catch (e) {}
      setTimeout(doCapture, 150);
    };
    tempImg.onerror = () => doCapture();
  } else {
    setTimeout(doCapture, 150);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadParticipantCount();
  if (new URLSearchParams(window.location.search).get('start') === 'true') {
    setTimeout(startTest, 500);
  }
});
