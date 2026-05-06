const galaxyId = new URLSearchParams(location.search).get('galaxyId');

async function fetchAll() {
  if (!galaxyId) return null;
  try {
    const [cfgRes, viewRes, itemsRes] = await Promise.all([
      fetch('/shared/story-config.json'),
      fetch(`/galaxies/${galaxyId}/view`),
      fetch(`/gallary/items?galaxyId=${encodeURIComponent(galaxyId)}`),
    ]);
    return {
      config: await cfgRes.json(),
      view:   viewRes.ok  ? (await viewRes.json()).meta  : null,
      items:  itemsRes.ok ? (await itemsRes.json()).meta : [],
    };
  } catch { return null; }
}

function groupByStage(items) {
  const map = {};
  items.forEach(item => {
    if (!item.stage) return;
    (map[item.stage] = map[item.stage] || []).push(item.imageUrl);
  });
  return map;
}

function resolveHook(chapterId, userChapters, configChapters) {
  const found = (userChapters || []).find(c => c.id === chapterId);
  if (found?.hookText) return found.hookText;
  return configChapters.find(c => c.id === chapterId)?.hooks[0] || '';
}

const elIntro         = document.getElementById('se-intro');
const elIntroTitle    = document.getElementById('se-intro-title');
const elIntroOccasion = document.getElementById('se-intro-occasion');
const elHook          = document.getElementById('se-hook');
const elHookText      = document.getElementById('se-hook-text');
const elPhoto         = document.getElementById('se-photo');
const elPhotoImg      = document.getElementById('se-photo-img');
const elCounter       = document.getElementById('se-counter');
const elFinale        = document.getElementById('se-finale');

const wait    = ms => new Promise(res => setTimeout(res, ms));
const fadeIn  = el => el.classList.add('visible');
const fadeOut = el => el.classList.remove('visible');

function waitTapOrTimer(ms) {
  return new Promise(resolve => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    const t = setTimeout(finish, ms);
    const onTap = () => { clearTimeout(t); finish(); };
    elPhoto.addEventListener('click',    onTap, { once: true });
    elPhoto.addEventListener('touchend', onTap, { once: true });
  });
}

async function playChapter(hookText, photoUrls) {
  elHookText.textContent = hookText;
  fadeIn(elHook);
  await wait(2800);
  fadeOut(elHook);
  await wait(600);

  for (let i = 0; i < photoUrls.length; i++) {
    elPhotoImg.src = photoUrls[i];

    elCounter.replaceChildren();
    photoUrls.forEach((_, di) => {
      const dot = document.createElement('div');
      dot.className = 'se-dot' + (di === i ? ' active' : '');
      elCounter.appendChild(dot);
    });

    fadeIn(elPhoto);
    await waitTapOrTimer(4500);
    fadeOut(elPhoto);
    await wait(400);
  }

  elCounter.replaceChildren();
}

async function main() {
  const data = await fetchAll();
  if (!data || !data.view?.storyType) {
    window.location.replace(`/view/?galaxyId=${galaxyId}&skip_se=true`);
    return;
  }

  const { config, view, items } = data;
  const occasionConf = config[view.storyType]?.occasions[view.occasion];
  if (!occasionConf) {
    window.location.replace(`/view/?galaxyId=${galaxyId}&skip_se=true`);
    return;
  }

  const configChapters = occasionConf.chapters;
  const grouped        = groupByStage(items);

  // Preload images
  Object.values(grouped).flat().forEach(url => { const img = new Image(); img.src = url; });

  elIntroTitle.textContent    = view.name || 'Lumora';
  elIntroOccasion.textContent = occasionConf.label || '';
  window.musicManager.init(view.music?.url || null);

  await new Promise(resolve => {
    const start = () => { elIntro.classList.add('hidden'); resolve(); };
    elIntro.addEventListener('click',    start, { once: true });
    elIntro.addEventListener('touchend', start, { once: true });
  });

  window.musicManager.play?.().catch?.(() => {});
  document.documentElement.requestFullscreen?.().catch?.(() => {});
  await wait(900);

  for (const chapter of configChapters) {
    const photos = grouped[chapter.id] || [];
    if (!photos.length) continue;
    const hook = resolveHook(chapter.id, view.chapters, configChapters);
    await playChapter(hook, photos);
    await wait(300);
  }

  fadeIn(elFinale);
  await wait(2800);
  window.location.replace(`/view/?galaxyId=${galaxyId}&skip_se=true`);
}

main();
