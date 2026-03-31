import * as THREE from "https://esm.sh/three@0.161.0";
import { OrbitControls } from "https://esm.sh/three@0.161.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "https://esm.sh/three@0.161.0/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "https://esm.sh/three@0.161.0/examples/jsm/loaders/FBXLoader.js";
import { STLLoader } from "https://esm.sh/three@0.161.0/examples/jsm/loaders/STLLoader.js";

export function initMosqueScene({ containerId, canvasId, loaderId, statusId, modelPath = "./models/mosque.glb", texturePath = "./models/mosque.jpg" }) {
  const container = document.getElementById(containerId);
  const canvas = document.getElementById(canvasId);
  const loaderOverlay = document.getElementById(loaderId);
  const status = document.getElementById(statusId);

  if (!container || !canvas) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 200);
  camera.position.set(7.5, 4.2, 7.8);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
  renderer.setSize(container.clientWidth, container.clientHeight, false);

  const ambient = new THREE.AmbientLight(0xffffff, 0.95);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 1.25);
  directional.position.set(8, 12, 7);
  scene.add(directional);

  const fill = new THREE.DirectionalLight(0xcfe6d9, 0.45);
  fill.position.set(-6, 4, -4);
  scene.add(fill);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.autoRotate = !prefersReducedMotion;
  controls.autoRotateSpeed = 0.35;
  controls.target.set(0, 1.8, 0);

  let activeModel = null;

  function getFocusBoundingBox(rootObject) {
    rootObject.updateWorldMatrix(true, true);

    const meshBounds = [];
    rootObject.traverse((child) => {
      if (!child.isMesh || !child.geometry) {
        return;
      }

      if (!child.geometry.boundingBox) {
        child.geometry.computeBoundingBox();
      }

      const localBox = child.geometry.boundingBox;
      if (!localBox || localBox.isEmpty()) {
        return;
      }

      const worldBox = localBox.clone().applyMatrix4(child.matrixWorld);
      const worldSize = worldBox.getSize(new THREE.Vector3());
      const maxDimension = Math.max(worldSize.x, worldSize.y, worldSize.z);
      const minDimension = Math.min(worldSize.x, worldSize.y, worldSize.z);

      meshBounds.push({
        box: worldBox,
        maxDimension,
        minDimension,
        name: String(child.name || "").toLowerCase()
      });
    });

    if (!meshBounds.length) {
      return new THREE.Box3().setFromObject(rootObject);
    }

    const sortedMax = meshBounds
      .map((item) => item.maxDimension)
      .sort((a, b) => a - b);
    const medianMax = sortedMax[Math.floor(sortedMax.length / 2)] || 1;

    const filteredBounds = meshBounds.filter((item) => {
      const flatRatio = item.minDimension / Math.max(item.maxDimension, 1e-6);
      const isVeryFlat = flatRatio < 0.02;
      const isHuge = item.maxDimension > medianMax * 4;
      const namedAsFloor = /ground|floor|plane|terrain/.test(item.name);

      return !(isVeryFlat && (isHuge || namedAsFloor));
    });

    const boundsToUse = filteredBounds.length ? filteredBounds : meshBounds;
    const focusBox = boundsToUse[0].box.clone();
    for (let index = 1; index < boundsToUse.length; index += 1) {
      focusBox.union(boundsToUse[index].box);
    }

    return focusBox;
  }

  // Normalize model position and scale so camera framing is consistent.
  function fitModelToView(object3D) {
    const box = getFocusBoundingBox(object3D);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    object3D.position.x -= center.x;
    object3D.position.y -= box.min.y;
    object3D.position.z -= center.z;

    const maxDimension = Math.max(size.x, size.y, size.z) || 1;
    const targetSize = 10.5;
    const scale = targetSize / maxDimension;
    object3D.scale.setScalar(scale);

    const fittedBox = getFocusBoundingBox(object3D);
    const sphere = fittedBox.getBoundingSphere(new THREE.Sphere());
    const halfFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
    const fitOffset = 1.15;
    const distance = (sphere.radius / Math.tan(halfFov)) * fitOffset;

    controls.target.copy(sphere.center);
    camera.near = Math.max(0.01, distance / 100);
    camera.far = Math.max(250, distance * 40);
    camera.updateProjectionMatrix();

    camera.position.set(
      sphere.center.x + distance * 0.85,
      sphere.center.y + distance * 0.45,
      sphere.center.z + distance * 0.9
    );
    camera.lookAt(controls.target);
  }

  // Procedural fallback so site remains fully functional without a GLB asset.
  function createProceduralMosque() {
    const group = new THREE.Group();
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.88, metalness: 0.02 });
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x6c8f79, roughness: 0.7, metalness: 0.05 });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x506d5b, roughness: 0.6, metalness: 0.1 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 6), wallMaterial);
    base.position.y = 0.3;
    group.add(base);

    const hall = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.2, 4.4), wallMaterial);
    hall.position.y = 1.7;
    group.add(hall);

    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.45, 32, 20), roofMaterial);
    dome.position.y = 3.2;
    dome.scale.set(1, 0.72, 1);
    group.add(dome);

    const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.28, 24), wallMaterial);
    domeBase.position.y = 2.35;
    group.add(domeBase);

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.2, 0.08), accentMaterial);
    door.position.set(0, 1.2, 2.24);
    group.add(door);

    const windowGeo = new THREE.BoxGeometry(0.45, 0.6, 0.08);
    const windows = [-1.2, 1.2].map((x) => {
      const windowMesh = new THREE.Mesh(windowGeo, accentMaterial);
      windowMesh.position.set(x, 1.75, 2.24);
      return windowMesh;
    });
    windows.forEach((windowMesh) => group.add(windowMesh));

    const minaretGeometry = new THREE.CylinderGeometry(0.33, 0.43, 4.6, 18);
    const minaretCapGeometry = new THREE.ConeGeometry(0.45, 1, 18);

    [-2.45, 2.45].forEach((x) => {
      const shaft = new THREE.Mesh(minaretGeometry, wallMaterial);
      shaft.position.set(x, 2.3, -2.2);

      const cap = new THREE.Mesh(minaretCapGeometry, roofMaterial);
      cap.position.set(x, 5.1, -2.2);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.06, 10, 20), accentMaterial);
      ring.position.set(x, 4.4, -2.2);
      ring.rotation.x = Math.PI / 2;

      group.add(shaft, cap, ring);
    });

    const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 16, 36, Math.PI * 1.72), accentMaterial);
    crescent.position.set(0, 4.3, 0);
    crescent.rotation.z = Math.PI / 2.4;
    group.add(crescent);

    const star = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), accentMaterial);
    star.position.set(0.18, 4.45, 0);
    group.add(star);

    return group;
  }

  function showReadyMessage(message) {
    if (status) {
      status.textContent = message;
    }
    container.classList.add("is-ready");
    container.setAttribute("aria-busy", "false");
    if (loaderOverlay) {
      loaderOverlay.setAttribute("aria-hidden", "true");
    }
  }

  function extensionFromPath(path) {
    const normalized = String(path || "").split("?")[0].toLowerCase();
    const index = normalized.lastIndexOf(".");
    return index >= 0 ? normalized.slice(index + 1) : "";
  }

  function loadTextureOptional(path) {
    return new Promise((resolve) => {
      if (!path) {
        resolve(null);
        return;
      }

      new THREE.TextureLoader().load(
        path,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          resolve(texture);
        },
        undefined,
        () => resolve(null)
      );
    });
  }

  function applyTextureToObject3D(object3D, texture) {
    if (!texture) {
      return;
    }

    object3D.traverse((child) => {
      if (child.isMesh) {
        const previousMaterial = child.material;
        const nextMaterial = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.8,
          metalness: 0.1
        });

        child.material = nextMaterial;

        if (previousMaterial && typeof previousMaterial.dispose === "function") {
          previousMaterial.dispose();
        }
      }
    });
  }

  function loadModelObject(path, texture) {
    const extension = extensionFromPath(path);

    return new Promise((resolve, reject) => {
      if (extension === "gltf" || extension === "glb") {
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(
          path,
          (gltf) => resolve(gltf.scene),
          undefined,
          reject
        );
        return;
      }

      if (extension === "obj") {
        const objLoader = new OBJLoader();
        objLoader.load(
          path,
          (obj) => {
            applyTextureToObject3D(obj, texture);
            resolve(obj);
          },
          undefined,
          reject
        );
        return;
      }

      if (extension === "fbx") {
        const fbxLoader = new FBXLoader();
        fbxLoader.load(
          path,
          (fbx) => {
            applyTextureToObject3D(fbx, texture);
            resolve(fbx);
          },
          undefined,
          reject
        );
        return;
      }

      if (extension === "stl") {
        const stlLoader = new STLLoader();
        stlLoader.load(
          path,
          (geometry) => {
            geometry.computeVertexNormals();
            const material = new THREE.MeshStandardMaterial({
              color: 0xe3ddd0,
              map: texture,
              roughness: 0.85,
              metalness: 0.08
            });
            const mesh = new THREE.Mesh(geometry, material);
            resolve(mesh);
          },
          undefined,
          reject
        );
        return;
      }

      reject(new Error(`Unsupported model format: ${extension || "unknown"}`));
    });
  }

  // Try configured model path first; on failure, render lightweight procedural mosque.
  loadTextureOptional(texturePath)
    .then((texture) => loadModelObject(modelPath, texture))
    .then((loadedModel) => {
      activeModel = loadedModel;
      fitModelToView(activeModel);
      scene.add(activeModel);
      showReadyMessage("نموذج المسجد جاهز");
    })
    .catch(() => {
      activeModel = createProceduralMosque();
      fitModelToView(activeModel);
      scene.add(activeModel);
      showReadyMessage("تم استخدام نموذج ثلاثي الأبعاد بديل");
    });

  let isSceneVisible = true;
  let rafId = 0;

  // Render only when visible to reduce GPU/CPU usage.
  function renderLoop() {
    if (!isSceneVisible) {
      return;
    }

    controls.update();
    renderer.render(scene, camera);
    rafId = window.requestAnimationFrame(renderLoop);
  }

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        isSceneVisible = entry.isIntersecting;

        if (isSceneVisible && !rafId) {
          renderLoop();
        }

        if (!isSceneVisible && rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
      });
    },
    { threshold: 0.05 }
  );
  visibilityObserver.observe(container);

  // Keep canvas sharp while limiting pixel ratio on mobile for performance.
  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (!width || !height) {
      return;
    }

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    renderer.setSize(width, height, false);
  };

  window.addEventListener("resize", resize, { passive: true });

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
  }

  resize();
  renderLoop();
}
