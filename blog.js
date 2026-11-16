/* =====================================================================
   blog.js — posts.html আর post.html-এর শেয়ার্ড কোড
   🔧 Firebase কনফিগ (index.html ও admin.html-এর সাথে একই মান)
   ===================================================================== */
const FB = { apiKey: "AIzaSyBD1Fl_NJGlshlk7XvxYcoedqLlpfo5jgM", projectId: "biswajit-portfolio-dca91" };

const BS = (() => {
  const CLOUD = !!(FB.apiKey && FB.projectId);
  const BASE = `https://firestore.googleapis.com/v1/projects/${FB.projectId}/databases/(default)/documents/posts`;
  const LKEY = 'bs_posts_local';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = t => new Date(t).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});
  const linkify = t => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

  const dec = d => {
    const f = d.fields || {};
    const images = (f.images?.arrayValue?.values || []).map(v => v.stringValue);
    return {
      id: d.name.split('/').pop(),
      title: f.title?.stringValue || '',
      body: f.body?.stringValue || '',
      tag: f.tag?.stringValue || '',
      link: f.link?.stringValue || '',
      cover: f.cover?.stringValue || '',
      imgCount: +(f.imgCount?.integerValue || images.length || 0),
      images,
      createdAt: +(f.createdAt?.integerValue || 0)
    };
  };
  const localAll = () => {
    try { return JSON.parse(localStorage.getItem(LKEY) || '[]').map(p => ({...p, cover: p.cover || p.images?.[0] || '', imgCount: p.imgCount || p.images?.length || 0})); }
    catch (e) { return []; }
  };

  /* হালকা লিস্ট (ছবির ভারী ডেটা ছাড়া) — সব পোস্ট, নতুন আগে */
  async function listPosts() {
    if (!CLOUD) return localAll().sort((a, b) => b.createdAt - a.createdAt);
    const mask = ['title','body','tag','cover','imgCount','createdAt'].map(f => 'mask.fieldPaths=' + f).join('&');
    let out = [], token = '';
    for (let i = 0; i < 10; i++) {
      const r = await fetch(`${BASE}?pageSize=300&orderBy=createdAt%20desc&${mask}${token ? '&pageToken=' + encodeURIComponent(token) : ''}`);
      if (!r.ok) throw new Error('load failed ' + r.status);
      const j = await r.json();
      out = out.concat((j.documents || []).map(dec));
      token = j.nextPageToken;
      if (!token) break;
    }
    return out;
  }

  /* একটা পুরো পোস্ট (সব ছবিসহ) */
  async function getPost(id) {
    if (!CLOUD) return localAll().find(p => p.id === id) || null;
    const r = await fetch(`${BASE}/${encodeURIComponent(id)}`);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('load failed ' + r.status);
    return dec(await r.json());
  }

  /* কার্ড HTML — cover না থাকলে (পুরনো পোস্ট) পরে লোড হবে */
  const card = p => `
    <a class="post" href="post.html?id=${encodeURIComponent(p.id)}">
      <div class="pimg">${p.cover ? `<img loading="lazy" src="${p.cover}" alt="${esc(p.title)}">` : `<img data-fill="${esc(p.id)}" alt="" style="opacity:0">`}
        ${p.tag ? `<span class="ptag">${esc(p.tag)}</span>` : ''}${p.imgCount > 1 ? `<span class="pcount">📷 ${p.imgCount}</span>` : ''}</div>
      <div class="pbody"><time>${fmt(p.createdAt)}</time><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p><span class="rd">Read more →</span></div>
    </a>`;

  function fillMissingCovers(root) {
    root.querySelectorAll('img[data-fill]').forEach(img => {
      getPost(img.dataset.fill).then(p => { if (p?.images?.[0]) { img.src = p.images[0]; img.style.opacity = 1; } }).catch(() => {});
    });
  }

  return { CLOUD, esc, fmt, linkify, listPosts, getPost, card, fillMissingCovers };
})();

/* মোবাইল মেনু */
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.hasAttribute('data-bs-home')) return;   // index.html-এর নিজস্ব হ্যান্ডলার আছে
  const b = document.getElementById('burger'), l = document.getElementById('links');
  if (b && l) { b.onclick = () => l.classList.toggle('open'); l.querySelectorAll('a').forEach(a => a.onclick = () => l.classList.remove('open')); }
  const nav = document.getElementById('nav');
  if (nav) addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 30));
  const y = document.getElementById('yr'); if (y) y.textContent = new Date().getFullYear();
});
