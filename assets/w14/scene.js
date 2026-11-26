const last = 41;
const image = document.querySelector('#car');
const scene = document.querySelector('#scene');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const frames = Array.from({length:last + 1}, (_, index) => {
  const frame = new Image();
  frame.src = '/assets/w14/view-' + String(index).padStart(2, '0') + '.webp';
  return frame;
});
let position = 0;
let motion = 0;
let intro;
let drag;
function show(value) {
  position = Math.max(0, Math.min(last, Math.round(value)));
  image.src = frames[position].src;
  scene.classList.toggle('past-side-title', position >= 12);
  scene.style.setProperty('--side-title-opacity', Math.max(0, Math.min(1, (11 - position) / 8)));
  scene.classList.toggle('has-welcome', position >= 19);
  scene.style.setProperty('--reveal', Math.max(0, Math.min(1, (position - 20) / 10)));
  document.body.classList.toggle('front', position > 8);
  scene.setAttribute('aria-label', position < last / 2 ? 'Rotate the W14 to front view' : 'Rotate the W14 to side view');
}
function go(target) {
  clearTimeout(intro);
  cancelAnimationFrame(motion);
  if (reduced.matches || position === target) return show(target);
  const start = performance.now();
  const from = position;
  const duration = Math.abs(target - from) * 1000 / 30;
  function update(now) {
    const fraction = Math.min(1, (now - start) / duration);
    show(from + (target - from) * fraction);
    if (fraction < 1) motion = requestAnimationFrame(update);
  }
  motion = requestAnimationFrame(update);
}
scene.onpointerdown = event => {
  if (event.button !== 0) return;
  clearTimeout(intro);
  cancelAnimationFrame(motion);
  drag = {x:event.clientX, from:position, moved:false};
  scene.setPointerCapture(event.pointerId);
};
scene.onpointermove = event => {
  if (!drag && event.pointerType === 'mouse' && event.buttons === 0) {
    clearTimeout(intro);
    cancelAnimationFrame(motion);
    const bounds = scene.getBoundingClientRect();
    show((event.clientX - bounds.left) / bounds.width * last);
    return;
  }
  if (!drag) return;
  const delta = event.clientX - drag.x;
  if (Math.abs(delta) > 5) drag.moved = true;
  if (drag.moved) show(drag.from + delta * last / (scene.clientWidth * .42));
};
let ignoreClick = false;
scene.onpointerup = () => {
  ignoreClick = Boolean(drag?.moved);
  drag = null;
};
scene.onpointercancel = () => { drag = null; };
scene.onclick = event => {
  if (!ignoreClick || event.detail === 0) go(position < last / 2 ? last : 0);
  ignoreClick = false;
};
if (!reduced.matches) intro = setTimeout(() => go(last), 4200);
