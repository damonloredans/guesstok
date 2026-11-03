import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import settings from './settings.js';
import { pixelWidthFor, wipeState } from './pixelwidth.js';

const MODELS_DIR = 'models/';
const ZOOM_EASE = 6; // how fast the camera pulls back at the reveal (per second)

function disposeTree(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    o.skeleton?.dispose(); // skinned animal models hold a bone texture
    for (const m of [].concat(o.material ?? [])) {
      for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
      m.dispose();
    }
  });
}

// Two canvases show the same scene: `base` at the current stage's resolution, and `top` one stage sharper,
// clipped so only the part above the wipe line `scan` shows. The line sweeps down once per stage.
export function createPixelView({ base, top, scan }) {
  const makeRenderer = (canvas) => {
    const r = new THREE.WebGLRenderer({ canvas, antialias: false });
    r.setPixelRatio(1);
    canvas.style.imageRendering = 'pixelated'; // keep the low-res render as hard squares
    return r;
  };
  const rBase = makeRenderer(base);
  const rTop = makeRenderer(top);
  const widths = new Map(); // last size set per renderer: setSize reallocates, so only when it changes
  const sizeTo = (r, w) => {
    if (widths.get(r) === w) return;
    widths.set(r, w);
    r.setSize(w, w, false); // false: leave the canvas CSS size alone
  };

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444455, 2));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(2, 3, 4);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0.6, 3);
  camera.lookAt(0, 0, 0);

  const loader = new GLTFLoader();
  let pivot = null; // current model, spun around its own centre
  let latest = 0; // id of the newest show() call
  let clock = null; // { startedAt } while a round is sharpening, null once revealed
  let zoomTarget = 1;
  let boost = 0; // extra spin speed from likes, decays back to 0

  async function show(file) {
    const id = ++latest;
    // encode per segment: item paths contain spaces and apostrophes
    const url = MODELS_DIR + file.split('/').map(encodeURIComponent).join('/');
    const gltf = await loader.loadAsync(url); // rejects on failure; previous model stays untouched
    if (id !== latest) { // a newer show() superseded this load
      disposeTree(gltf.scene);
      return;
    }
    const model = gltf.scene;
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model, true); // precise: skinned animals report absurd bone-based boxes otherwise
    const size = box.getSize(new THREE.Vector3());
    model.position.sub(box.getCenter(new THREE.Vector3()));
    const next = new THREE.Group();
    next.add(model);
    next.scale.setScalar(2 / (size.length() || 1)); // bounding diagonal = 2, fits at any rotation
    if (pivot) { scene.remove(pivot); disposeTree(pivot); }
    pivot = next;
    scene.add(pivot);
  }

  function setZoom(z) {
    camera.zoom = z;
    camera.updateProjectionMatrix();
  }

  let last = performance.now();
  rBase.setAnimationLoop((now) => {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    const { base: baseSpin, decaySeconds } = settings.spin;
    boost *= Math.exp(-dt / decaySeconds);
    if (pivot) pivot.rotation.y += dt * (baseSpin + boost);

    if (Math.abs(zoomTarget - camera.zoom) > 1e-3) setZoom(camera.zoom + (zoomTarget - camera.zoom) * (1 - Math.exp(-dt * ZOOM_EASE)));

    const state = clock
      ? wipeState(Date.now() - clock.startedAt, settings.stageSeconds * 1000, settings.stages)
      : { stage: settings.stages - 1, next: settings.stages - 1, progress: 0 }; // revealed: fully sharp
    sizeTo(rBase, pixelWidthFor(state.stage));
    const wiping = state.next !== state.stage;
    top.style.visibility = scan.style.visibility = wiping ? 'visible' : 'hidden';
    if (wiping) {
      sizeTo(rTop, pixelWidthFor(state.next));
      top.style.clipPath = `inset(0 0 ${(1 - state.progress) * 100}% 0)`; // show only the part the line has passed
      scan.style.top = `${state.progress * 100}%`;
      rTop.render(scene, camera);
    }
    rBase.render(scene, camera);
  });

  return {
    show,
    // Begin sharpening from `startedAt` (the same time the round uses). A zoom round starts zoomed in.
    start({ startedAt, zoom }) {
      clock = { startedAt };
      zoomTarget = zoom ? settings.zoom : 1;
      setZoom(zoomTarget);
    },
    // Round over: show the whole item sharp and pull the camera back out.
    reveal() {
      clock = null;
      zoomTarget = 1;
    },
    // Likes make the item spin faster for a moment.
    boostSpin(likes) {
      boost = Math.min(settings.spin.max, boost + likes * settings.spin.perLike);
    },
  };
}
