import { posts, topics } from './data.js';

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paths = {
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  trending: '<path d="m3 17 6-6 4 4 8-10M15 5h6v6"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m3 9v-2a6 6 0 0 0-2-4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  sparkles: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4"/>',
  workflow: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M9 6h6a3 3 0 0 1 3 3v6M6 9v9h9"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4V3Z"/>',
  arrow: '<path d="M6 18 18 6M6 6h12v12"/>',
  right: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  person: '<circle cx="12" cy="7" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.layers}</svg>`;
const storageKey = 'shitie-preview-v1';
let storageAvailable = true;
let stored = {};
try {
  const value = JSON.parse(localStorage.getItem(storageKey) || '{}');
  if (value && typeof value === 'object') stored = value;
} catch { storageAvailable = false; }
const initialQuery = new URLSearchParams(location.search);
const state = {
  topic: topics.some(topic => topic.id === initialQuery.get('topic')) ? initialQuery.get('topic') : 'all',
  query: initialQuery.get('q') || '', type: 'all', audience: 'all', recipeOnly: false, origin: 'all',
  view: 'all', sort: 'editor', layout: stored.layout === 'list' ? 'list' : 'grid',
  saved: new Set(Array.isArray(stored.saved) ? stored.saved.filter(id => posts.some(post => post.id === id)) : []),
};
const dialog = $('#post-dialog');
let activePostId = null;
let toastTimer;

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3000);
}

function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ saved: [...state.saved], layout: state.layout }));
    storageAvailable = true;
    return true;
  } catch {
    storageAvailable = false;
    return false;
  }
}

const topicLabel = id => topics.find(topic => topic.id === id)?.label || id;
const normalize = value => value.normalize('NFKC').toLocaleLowerCase().trim();

function filteredPosts() {
  const words = normalize(state.query).split(/\s+/).filter(Boolean);
  const filtered = posts.filter(post => {
    const text = normalize([post.title, post.shortTitle || '', post.teaser || '', post.summary, post.reason, post.author, topicLabel(post.topic), post.audience, ...post.tags].join(' '));
    return (state.topic === 'all' || post.topic === state.topic)
      && (state.type === 'all' || post.type === state.type)
      && (state.audience === 'all' || post.audience === state.audience)
      && (!state.recipeOnly || !!post.recipe)
      && (state.origin === 'all' || post.kind === state.origin)
      && (state.view !== 'saved' || state.saved.has(post.id))
      && words.every(word => text.includes(word));
  });
  return state.sort === 'newest' ? filtered.sort((a, b) => b.date.localeCompare(a.date)) : filtered;
}

function hasFilters() {
  return state.topic !== 'all' || state.query.trim() !== '' || state.type !== 'all' || state.audience !== 'all' || state.recipeOnly || state.origin !== 'all';
}

function methodPreview(post) {
  // Original, code-drawn diagrams. These are not screenshots or generated results.
  if (post.preview === 'signup-quality') return `<div class="method-visual visual-case visual-quality" aria-hidden="true"><div class="case-sheet"><div class="case-sheet-head">Bannerbear<span>复盘笔记</span></div><div class="quality-stages"><span>注册</span><i></i><span>激活</span><i></i><span>付费</span></div><div class="quality-question">先确认分母，再看转化。</div></div></div>`;
  if (post.preview === 'email-launch') return `<div class="method-visual visual-case visual-emails" aria-hidden="true"><div class="email-stage">${icon('mail')}<span>预热</span><i></i><i></i></div><div class="email-arrow">${icon('right')}</div><div class="email-stage email-stage-second">${icon('mail')}<span>上线</span><i></i><i></i></div></div>`;
  if (post.preview === 'distribution') return `<div class="method-visual visual-case visual-distribution" aria-hidden="true"><div class="distribution-label">Chatbase / 早期分发</div><div class="distribution-nodes"><span>演示</span><i></i><span>社区</span><i></i><span>生态</span></div><div class="distribution-note">每个渠道，都要单独核对。</div></div>`;
  if (post.topic === 'growth') return `<div class="method-visual visual-social" aria-hidden="true"><div class="social-window"><div class="visual-windowbar"><span></span><span></span><span></span></div><div class="social-profile"><span class="visual-avatar">m</span><div><i></i><i></i></div><span class="social-x">𝕏</span></div><div class="social-line"></div><div class="social-line short"></div><div class="social-tags"><span>定位</span><span>发布</span><span>互动</span></div></div><div class="floating-reply">从一个话题开始 ${icon('right')}</div></div>`;
  if (post.id === 'product-image-recipe') return `<div class="method-visual visual-product" aria-hidden="true"><div class="product-shot source-shot"><div class="illustrated-cup"></div><span>参考素材</span></div><span class="visual-transfer">${icon('right')}</span><div class="product-shot scene-shot"><div class="scene-shadow"></div><div class="illustrated-cup"></div><span>场景思路</span></div></div>`;
  if (post.topic === 'business') return `<div class="method-visual visual-interview" aria-hidden="true"><div class="interview-card"><span class="interview-dot"></span><span class="interview-label">用户访谈</span><div class="interview-question">最近一次遇到<br>这个问题是什么时候？</div><div class="interview-people"><span>J</span><span>A</span><span>M</span><i></i></div></div><div class="interview-tag">先了解问题</div></div>`;
  if (post.topic === 'seo') return `<div class="method-visual visual-search" aria-hidden="true"><div class="search-window"><div class="visual-windowbar"><span></span><span></span><span></span></div><div class="visual-searchbar">${icon('search')}<span>搜索意图</span></div><div class="intent-row"><span class="intent-dot"></span><b>用户想解决什么？</b><i></i></div><div class="intent-row"><span class="intent-dot"></span><b>现有内容缺什么？</b><i></i></div><div class="intent-row"><span class="intent-dot"></span><b>读完能做什么？</b><i></i></div></div></div>`;
  if (post.topic === 'workflow') return `<div class="method-visual visual-workflow" aria-hidden="true"><div class="flow-line"><div class="flow-node">${icon('layers')}<span>收集</span></div><span class="flow-connector"></span><div class="flow-node flow-center">${icon('workflow')}<span>分类</span></div><span class="flow-connector"></span><div class="flow-node">${icon('copy')}<span>素材</span></div></div><div class="workflow-caption">把资料连接起来</div></div>`;
  return `<div class="method-visual visual-video" aria-hidden="true"><div class="storyboard"><div class="story-shot"><span>01</span><div class="story-object"></div></div><div class="story-shot"><span>02</span><div class="story-object detail-object"></div></div><div class="story-shot"><span>03</span><div class="story-object scene-object"></div></div></div><div class="video-timeline"><span></span><span></span><span></span></div><div class="video-play"><i></i></div></div>`;
}

function card(post) {
  const saved = state.saved.has(post.id);
  const topic = topics.find(item => item.id === post.topic);
  return `<article class="post-entry" data-post-id="${post.id}">
    <div class="entry-media"><button type="button" class="preview-open" data-open="${post.id}" aria-label="查看${escapeHtml(post.shortTitle || post.title)}">${methodPreview(post)}</button><span class="preview-caption">方法示意</span></div>
    <button type="button" class="bookmark-button" data-save="${post.id}" aria-pressed="${saved}" aria-label="${saved ? '取消收藏' : '收藏'}：${escapeHtml(post.title)}">${icon('bookmark')}</button>
    <div class="entry-body"><div class="entry-meta"><span class="entry-topic">${escapeHtml(topic.label)}</span><span class="entry-slash">/</span><span class="content-kind ${post.kind === 'historical' ? 'kind-historical' : 'kind-demo'}">${post.kind === 'historical' ? '历史复盘' : '虚构演示'}</span></div>
    <h3 class="entry-title"><button type="button" data-open="${post.id}">${escapeHtml(post.shortTitle || post.title)}</button></h3>
    <p class="entry-summary">${escapeHtml(post.teaser || post.summary)}</p>
    <footer class="entry-footer"><span class="entry-status">${escapeHtml(post.kind === 'historical' ? post.verification : '仅作界面演示')}</span><span class="entry-actions"><button type="button" class="text-action" data-open="${post.id}">${post.kind === 'historical' ? '看复盘' : '看方法'} ${icon('arrow')}</button>${post.recipe ? `<button type="button" class="text-action recipe-action" data-recipe="${post.id}">看配方 ${icon('right')}</button>` : ''}</span></footer></div>
  </article>`;
}

function render() {
  const filtered = filteredPosts();
  $('#post-feed').innerHTML = filtered.map(card).join('');
  $('#post-feed').dataset.layout = state.layout;
  const realCount = filtered.filter(post => post.kind === 'historical').length;
  const demoCount = filtered.length - realCount;
  $('#result-count').textContent = `${filtered.length} 条`;
  $('#content-notice').textContent = filtered.length === 0 ? '历史复盘与虚构演示已分别标注' : realCount === 0 ? `${demoCount} 条虚构演示` : demoCount === 0 ? `${realCount} 条历史复盘 · 作者自述，待复核` : `${realCount} 条历史复盘 / ${demoCount} 条虚构演示`;
  $('#saved-count').textContent = state.saved.size;
  $('#feed-title').textContent = state.view === 'saved' ? '我的收藏' : state.topic === 'all' ? '本期精选' : topicLabel(state.topic);
  $('#clear-search').hidden = state.query.length === 0;
  $('#reset-filters').hidden = !hasFilters();
  const activeFilters = [state.topic !== 'all', state.query.trim() !== '', state.type !== 'all', state.audience !== 'all', state.recipeOnly, state.origin !== 'all'].filter(Boolean).length;
  $('#filter-count').textContent = activeFilters ? ` · ${activeFilters} 项` : '';
  $('#empty-state').hidden = filtered.length > 0;
  $('#feed-end').hidden = filtered.length === 0;
  if (filtered.length === 0) {
    const noSavedPosts = state.view === 'saved' && state.saved.size === 0;
    $('#empty-title').textContent = noSavedPosts ? '还没有收藏，慢慢挑。' : '暂时没有匹配的内容';
    $('#empty-description').textContent = noSavedPosts ? '遇到值得再读的帖子，点一下书签。下次打开这个浏览器，还能找到它。' : '试试减少关键词，或调整主题、形式和人群筛选。';
    $('#empty-action').textContent = noSavedPosts ? '去看看精选' : '清除筛选';
    $('#empty-action').dataset.action = noSavedPosts ? 'discover' : 'reset';
  }
  document.querySelectorAll('[data-topic]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.topic === state.topic)));
  document.querySelectorAll('[data-layout]').forEach(button => {
    if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(button.dataset.layout === state.layout));
  });
  document.querySelectorAll('[data-view]').forEach(button => {
    const selected = button.dataset.view === state.view;
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('active', selected);
  });
  updateDialogSave();
  const nextUrl = new URL(location.href);
  if (state.topic === 'all') nextUrl.searchParams.delete('topic'); else nextUrl.searchParams.set('topic', state.topic);
  if (!state.query) nextUrl.searchParams.delete('q'); else nextUrl.searchParams.set('q', state.query);
  if (nextUrl.href !== location.href) history.replaceState(null, '', nextUrl.pathname + nextUrl.search + nextUrl.hash);
}

function resetFilters() {
  state.topic = 'all'; state.query = ''; state.type = 'all'; state.audience = 'all'; state.recipeOnly = false; state.origin = 'all';
  $('#search-input').value = '';
  $('#type-filter').value = 'all';
  $('#audience-filter').value = 'all';
  $('#recipe-filter').checked = false;
  $('#origin-filter').value = 'all';
  render();
}

function toggleSave(id) {
  if (!posts.some(post => post.id === id)) return;
  const wasSaved = state.saved.has(id);
  if (wasSaved) state.saved.delete(id); else state.saved.add(id);
  const persisted = persist();
  render();
  toast(persisted ? wasSaved ? '已取消收藏' : '已收藏，保存在当前浏览器' : '已在本次页面中更新；当前浏览器无法保存，刷新后会丢失');
}

function updateDialogSave() {
  const button = $('#detail-save');
  if (!button || !activePostId) return;
  const saved = state.saved.has(activePostId);
  button.setAttribute('aria-pressed', String(saved));
  button.innerHTML = `${icon('bookmark')}${saved ? '已收藏 · 点击取消' : '收藏这篇'}`;
}

function recipeMarkup(post) {
  if (!post.recipe) return '';
  return `<section class="recipe-section" id="recipe-section" aria-labelledby="recipe-title"><div class="recipe-heading"><h3 id="recipe-title">${escapeHtml(post.recipe.title)}</h3><span>${escapeHtml(post.recipe.status)}</span></div><form id="recipe-form"><div class="recipe-form">${post.recipe.inputs.map(input => `<label class="recipe-field">${escapeHtml(input.label)}${input.required ? ' *' : ''}<input name="${input.key}" ${input.required ? 'required' : ''} value="${escapeHtml(input.defaultValue || '')}" placeholder="${escapeHtml(input.placeholder)}" maxlength="500" autocomplete="off"></label>`).join('')}</div><pre id="recipe-preview" class="recipe-preview"></pre><button type="submit" class="button">${icon('copy')}复制配方</button><p class="recipe-help">请先补齐必填项。复制后可自行粘贴到合适的工具中；本站当前没有生成或自动执行功能。</p><p id="recipe-feedback" class="recipe-feedback" role="status" aria-live="polite"></p><textarea id="manual-copy" class="manual-copy" aria-label="手动复制配方内容" readonly hidden></textarea></form></section>`;
}

function recipeText(post) {
  const form = $('#recipe-form');
  return post.recipe.template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const field = post.recipe.inputs.find(input => input.key === key);
    return form.elements.namedItem(key)?.value.trim() || `[${field?.label || key}]`;
  });
}

function sourceAnchor(url, label) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !['x.com', 'threadreaderapp.com', 'www.bannerbear.com'].includes(parsed.hostname)) return '';
    return `<a class="source-link" href="${escapeHtml(parsed.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ${icon('arrow')}</a>`;
  } catch { return ''; }
}

function historicalDetail(post) {
  const source = post.source;
  const date = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(post.publishedAt));
  return `<div class="detail-meta">历史复盘 · 研究候选，尚待复核</div><h2 id="detail-title" class="detail-title">${escapeHtml(post.title)}</h2>
    <p class="detail-source">${escapeHtml(post.authorName)} ${escapeHtml(post.author)} · ${date}（北京时间）</p>
    <div class="source-links">${sourceAnchor(source.originalUrl, '查看X原帖')}${sourceAnchor(source.archiveUrl, '阅读线程存档')}${source.supplementUrl ? sourceAnchor(source.supplementUrl, '作者补充文章') : ''}</div>
    <p class="detail-notice">作者自述，未独立核实。${escapeHtml(source.notice)}</p>
    <section class="detail-conclusion"><small>编辑判断</small><p>${escapeHtml(post.editorialConclusion)}</p></section>
    <section class="detail-section"><h3>作者报告了什么</h3><div class="claim-grid">${post.claims.map(claim => `<div class="claim-item"><strong>${escapeHtml(claim.value)}</strong><span>${escapeHtml(claim.label)}</span><p>${escapeHtml(claim.context)}</p>${sourceAnchor(claim.source === 'supplement' ? source.supplementUrl : source.archiveUrl, claim.source === 'supplement' ? '作者博客' : '线程存档')}</div>`).join('')}</div></section>
    <section class="detail-section"><h3>原帖记录的做法</h3><ol>${post.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol></section>
    <section class="detail-section unsupported-section"><h3>不能据此得出的结论</h3><ul>${post.unsupported.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>
    <section class="detail-section"><h3>适用条件与缺口</h3><p>${escapeHtml(post.fit)} ${escapeHtml(post.cost)}</p><ul>${post.limitations.map(limit => `<li>${escapeHtml(limit)}</li>`).join('')}</ul></section>
    <details class="review-notes"><summary>查看筛选记录</summary><p>${escapeHtml(post.reason)}</p><p>${escapeHtml(source.promotion)}</p><p>来源读取日期：${escapeHtml(source.checkedAt)}。仅核对可读正文，未将截图、后台或原文未提供的信息当作证据。属于历史方法参考，近期有效性尚待核查；并非规则评分器的自动批准结果。</p></details>
    <div class="detail-takeaway"><small>可以怎样验证 · 本站建议</small><p>${escapeHtml(post.takeaway)}</p></div><div class="detail-controls"><button id="detail-save" type="button" class="button secondary" data-save="${post.id}"></button></div>`;
}

function openPost(id, focusRecipe = false, updateHash = true) {
  const post = posts.find(item => item.id === id);
  if (!post) return;
  activePostId = id;
  $('#detail-eyebrow').textContent = `${topicLabel(post.topic)} / ${post.type}`;
  $('#detail-content').innerHTML = post.kind === 'historical' ? historicalDetail(post) : `<div class="detail-meta">虚构演示 · 方法拆解</div><h2 id="detail-title" class="detail-title">${escapeHtml(post.title)}</h2><p class="detail-source">${escapeHtml(post.author)} · 示例日期 ${post.date}<br>虚构演示条目，没有对应的真实X原帖链接。</p><p class="detail-notice">此内容用于验证页面结构与操作。不是实际采集内容、已核查事实或生成结果。</p><div class="detail-states"><span class="evidence-chip">依据：${escapeHtml(post.evidence)}</span><span class="evidence-chip">核查／实测：${escapeHtml(post.verification)}</span></div><section class="detail-section"><h3>为什么精选</h3><p>${escapeHtml(post.reason)}</p></section><section class="detail-section"><h3>核心方法</h3><p>${escapeHtml(post.summary)}</p></section><section class="detail-section"><h3>可以怎样开始</h3><ol>${post.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol></section><section class="detail-section"><h3>适用条件与限制</h3><p>适合 ${escapeHtml(post.audience)} · ${escapeHtml(post.cost)}</p><ul>${post.limitations.map(limit => `<li>${escapeHtml(limit)}</li>`).join('')}</ul></section><div class="detail-takeaway"><small>下一步行动</small><p>${escapeHtml(post.takeaway)}</p></div><div class="detail-controls"><button id="detail-save" type="button" class="button secondary" data-save="${post.id}"></button>${post.recipe ? '<button type="button" class="text-action" id="jump-recipe">跳到配方 ↓</button>' : ''}</div>${recipeMarkup(post)}`;
  updateDialogSave();
  if (post.recipe) {
    const updatePreview = () => { $('#recipe-preview').textContent = recipeText(post); $('#recipe-feedback').textContent = ''; $('#manual-copy').hidden = true; };
    updatePreview();
    $('#recipe-form').addEventListener('input', updatePreview);
    $('#recipe-form').addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      for (const input of post.recipe.inputs.filter(item => item.required)) {
        const field = form.elements.namedItem(input.key);
        if (!field.value.trim()) { field.setCustomValidity('请填写这项内容，不能只输入空格。'); field.reportValidity(); field.addEventListener('input', () => field.setCustomValidity(''), { once: true }); return; }
      }
      const text = recipeText(post);
      const feedback = $('#recipe-feedback');
      const manual = $('#manual-copy');
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(text);
        feedback.textContent = '配方已复制。请自行准备素材并核对目标工具的要求。';
      } catch {
        manual.hidden = false;
        manual.value = text;
        manual.focus(); manual.select();
        feedback.textContent = '浏览器未允许自动复制。已选中完整配方，请使用 Ctrl+C 或长按复制。';
      }
    });
    $('#jump-recipe').addEventListener('click', () => $('#recipe-section').scrollIntoView({ block: 'start' }));
  }
  if (!dialog.open) dialog.showModal();
  document.documentElement.style.overflow = 'hidden';
  dialog.scrollTop = 0;
  if (updateHash) history.replaceState(null, '', `#post=${encodeURIComponent(id)}`);
  if (focusRecipe && post.recipe) requestAnimationFrame(() => { $('#recipe-section').scrollIntoView({ block: 'start' }); $('#recipe-form input').focus({ preventScroll: true }); });
}

$('#topic-nav').innerHTML = topics.map(topic => {
  const count = topic.id === 'all' ? posts.length : posts.filter(post => post.topic === topic.id).length;
  return `<button type="button" class="topic-button" data-topic="${topic.id}" aria-pressed="${topic.id === 'all'}">${icon(topic.icon)}<span>${topic.label}</span><span class="topic-count">${count}</span></button>`;
}).join('');

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.topic) { state.topic = button.dataset.topic; render(); }
  else if (button.dataset.view) { state.view = button.dataset.view; resetFilters(); }
  else if (button.dataset.layout) { state.layout = button.dataset.layout; persist(); render(); }
  else if (button.dataset.save) toggleSave(button.dataset.save);
  else if (button.dataset.open) openPost(button.dataset.open);
  else if (button.dataset.recipe) openPost(button.dataset.recipe, true);
});
$('#search-form').addEventListener('submit', event => event.preventDefault());
$('#search-input').addEventListener('input', event => { state.query = event.target.value; render(); });
$('#clear-search').addEventListener('click', () => { state.query = ''; $('#search-input').value = ''; render(); $('#search-input').focus(); });
$('#type-filter').addEventListener('change', event => { state.type = event.target.value; render(); });
$('#audience-filter').addEventListener('change', event => { state.audience = event.target.value; render(); });
$('#origin-filter').addEventListener('change', event => { state.origin = event.target.value; render(); });
$('#recipe-filter').addEventListener('change', event => { state.recipeOnly = event.target.checked; render(); });
$('#sort-order').addEventListener('change', event => { state.sort = event.target.value; render(); });
$('#reset-filters').addEventListener('click', resetFilters);
$('#empty-action').addEventListener('click', event => { if (event.currentTarget.dataset.action === 'discover') state.view = 'all'; resetFilters(); });
$('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
dialog.addEventListener('close', () => { document.documentElement.style.overflow = ''; activePostId = null; history.replaceState(null, '', `${location.pathname}${location.search}`); });
window.addEventListener('hashchange', () => {
  const hash = new URLSearchParams(location.hash.slice(1));
  const id = hash.get('post');
  if (id) openPost(id, false, false); else if (dialog.open) dialog.close();
});
window.addEventListener('storage', event => {
  if (event.key !== storageKey && event.key !== null) return;
  try {
    const next = event.newValue ? JSON.parse(event.newValue) : {};
    if (!next || typeof next !== 'object') return;
    state.saved = new Set(Array.isArray(next.saved) ? next.saved.filter(id => posts.some(post => post.id === id)) : []);
    state.layout = next.layout === 'list' ? 'list' : 'grid';
    render();
  } catch { /* Ignore malformed storage events from another tab. */ }
});
$('#search-input').value = state.query;
render();
const initialId = new URLSearchParams(location.hash.slice(1)).get('post');
if (initialId) openPost(initialId, false, false);
if (!storageAvailable) toast('当前浏览器无法读取收藏记录，本次仍可浏览和收藏。');
