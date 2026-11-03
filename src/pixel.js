import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { pixelWidthFor } from './pixelwidth.js';

const MODELS_DIR = 'models/';
const SPIN_RAD_PER_SEC = 0.6;

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

export function createPixelView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(1);
  canvas.style.imageRendering = 'pixelated'; // keep the low-res render as hard squares

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

  function setStage(stage) {
    const w = pixelWidthFor(stage);
    renderer.setSize(w, w, false); // false: leave the canvas CSS size alone
  }

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

  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    if (pivot) pivot.rotation.y += ((now - last) / 1000) * SPIN_RAD_PER_SEC;
    last = now;
    renderer.render(scene, camera);
  });

  setStage(0);
  return { show, setStage };
}
