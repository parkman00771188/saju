// 인트로 배경: 천간·지지 성반(星盤) + 별 입자 + 워프 전환
import * as THREE from 'three';
import { STEMS, BRANCHES, STEM_KO, BRANCH_KO, STEM_ELEMENT, BRANCH_ELEMENT, ELEMENT_COLOR } from '../saju/tables.js';

function glyphTexture(ch, sub, hex) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 30, 128, 128, 128);
  grd.addColorStop(0, hex + 'e6');
  grd.addColorStop(0.55, hex + '55');
  grd.addColorStop(1, hex + '00');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#fffaf0';
  g.font = '700 118px "Noto Serif KR", "Nanum Myeongjo", serif';
  g.fillText(ch, 128, 116);
  g.fillStyle = 'rgba(255,250,240,.8)';
  g.font = '500 34px "Noto Sans KR", sans-serif';
  g.fillText(sub, 128, 206);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

function glowTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.35, outer);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function starField(count, rMin, rMax, color, size, map) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = rMin + Math.random() * (rMax - rMin);
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color, size, map, transparent: true, opacity: 0.9, sizeAttenuation: true,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}

const ease = {
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
};

export class CosmosScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouse = { x: 0, y: 0 };
    this.mode = 'intro';
    this.warpState = null;
    this.spriteMats = [];
    this.disposed = false;
    // 목표값 (모드 전환 시 부드럽게 보간)
    this.target = { camZ: 64, camY: 6, ringOpacity: 1, starOpacity: 0.9, coreOpacity: 1 };
    this.cur = { ...this.target };
  }

  init() {
    const { canvas } = this;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x070912, 0.0045);
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    this.camera.position.set(0, 6, 64);

    // 별 (둥근 글로우 점 텍스처)
    const dot = glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,.28)');
    this.stars = starField(2600, 90, 320, 0xcbd5ff, 1.6, dot);
    this.dust = starField(900, 30, 110, 0xd9b46a, 1.1, dot);
    this.scene.add(this.stars, this.dust);

    // 성반 (지지 12 / 천간 10)
    this.disk = new THREE.Group();
    this.disk.rotation.x = 0.62;
    this.branchRing = new THREE.Group();
    this.stemRing = new THREE.Group();
    this.disk.add(this.branchRing, this.stemRing);
    this.scene.add(this.disk);

    const ringLine = (r, opacity) => {
      const geo = new THREE.TorusGeometry(r, 0.035, 8, 160);
      const mat = new THREE.MeshBasicMaterial({ color: 0xd9b46a, transparent: true, opacity });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = Math.PI / 2;
      this.spriteMats.push(mat);
      return m;
    };
    this.disk.add(ringLine(22, 0.35), ringLine(13, 0.28), ringLine(30, 0.12));

    const buildGlyphs = () => {
      BRANCHES.forEach((b, i) => {
        const el = BRANCH_ELEMENT[b];
        const mat = new THREE.SpriteMaterial({ map: glyphTexture(b, BRANCH_KO[b], ELEMENT_COLOR[el].bg), transparent: true, depthWrite: false });
        const s = new THREE.Sprite(mat);
        const a = (i / 12) * Math.PI * 2;
        s.position.set(Math.cos(a) * 22, 0, Math.sin(a) * 22);
        s.scale.set(5.2, 5.2, 1);
        this.branchRing.add(s);
        this.spriteMats.push(mat);
      });
      STEMS.forEach((st, i) => {
        const el = STEM_ELEMENT[st];
        const mat = new THREE.SpriteMaterial({ map: glyphTexture(st, STEM_KO[st], ELEMENT_COLOR[el].bg), transparent: true, depthWrite: false });
        const s = new THREE.Sprite(mat);
        const a = (i / 10) * Math.PI * 2;
        s.position.set(Math.cos(a) * 13, 0, Math.sin(a) * 13);
        s.scale.set(4.3, 4.3, 1);
        this.stemRing.add(s);
        this.spriteMats.push(mat);
      });
    };
    if (document.fonts?.ready) document.fonts.ready.then(() => !this.disposed && buildGlyphs());
    else buildGlyphs();

    // 중심 태극 코어
    this.core = new THREE.Group();
    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(4.2, 1),
      new THREE.MeshBasicMaterial({ color: 0xd9b46a, wireframe: true, transparent: true, opacity: 0.35 })
    );
    const inner = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffe6b0, transparent: true, opacity: 0.22 })
    );
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,236,190,.95)', 'rgba(217,180,106,.35)'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    glow.scale.set(16, 16, 1);
    this.core.add(wire, inner, glow);
    this.coreMats = [wire.material, inner.material, glow.material];
    this.scene.add(this.core);

    // 은은한 성운
    const nebula = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(90,70,160,.35)', 'rgba(40,60,120,.18)'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    nebula.scale.set(170, 170, 1);
    nebula.position.set(20, -10, -80);
    this.scene.add(nebula);

    this.onResize = () => this.resize();
    this.onMouse = (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', this.onMouse);
    this.resize();
    this.clock = new THREE.Clock();
    this.loop = () => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(this.loop);
      this.tick();
    };
    this.loop();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'intro') this.target = { camZ: 64, camY: 6, ringOpacity: 1, starOpacity: 0.9, coreOpacity: 1 };
    else this.target = { camZ: 96, camY: 18, ringOpacity: 0.28, starOpacity: 0.5, coreOpacity: 0.35 };
  }

  /** 카메라가 코어로 돌입하는 워프. 완료 시 resolve */
  warp() {
    return new Promise((resolve) => {
      this.warpState = { start: performance.now(), dur: 1500, resolve, fromZ: this.camera.position.z };
    });
  }

  tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    this.stars.rotation.y += dt * 0.012;
    this.dust.rotation.y -= dt * 0.02;
    this.branchRing.rotation.y += dt * 0.08;
    this.stemRing.rotation.y -= dt * 0.12;
    this.disk.rotation.z = Math.sin(t * 0.15) * 0.05;
    const pulse = 1 + Math.sin(t * 1.6) * 0.06;
    this.core.scale.setScalar(pulse);
    this.core.rotation.y += dt * 0.25;
    this.core.rotation.x += dt * 0.1;

    // 모드 보간
    const k = 1 - Math.pow(0.001, dt); // 프레임 독립 lerp
    for (const key of Object.keys(this.target)) this.cur[key] += (this.target[key] - this.cur[key]) * k * 0.6;

    let camZ = this.cur.camZ, camY = this.cur.camY;
    let starSize = 1.5, ringScale = 1, ringOpacity = this.cur.ringOpacity, coreOpacity = this.cur.coreOpacity;

    if (this.warpState) {
      const p = Math.min(1, (performance.now() - this.warpState.start) / this.warpState.dur);
      const e = ease.inCubic(p);
      camZ = this.warpState.fromZ + (2.5 - this.warpState.fromZ) * e;
      camY = this.cur.camY * (1 - e);
      starSize = 1.5 + e * 9;
      ringScale = 1 + e * 2.2;
      ringOpacity = this.cur.ringOpacity * (1 - ease.outCubic(p));
      coreOpacity = 1 + e * 1.5;
      if (p >= 1) {
        const { resolve } = this.warpState;
        this.warpState = null;
        this.setMode('ambient');
        this.cur.camZ = 140; // 결과 화면 뒤에서 멀리서 다시 다가옴
        resolve();
      }
    }

    this.stars.material.size = starSize;
    this.stars.material.opacity = this.cur.starOpacity;
    this.dust.material.opacity = this.cur.starOpacity * 0.8;
    this.disk.scale.setScalar(ringScale);
    for (const m of this.spriteMats) m.opacity = (m.userData.base ??= m.opacity) * ringOpacity;
    this.coreMats.forEach((m) => { m.opacity = (m.userData.base ??= m.opacity) * coreOpacity; });

    const px = this.mouse.x * 4, py = -this.mouse.y * 2.5;
    this.camera.position.x += (px - this.camera.position.x) * 0.04;
    this.camera.position.y += (camY + py - this.camera.position.y) * 0.06;
    this.camera.position.z += (camZ - this.camera.position.z) * (this.warpState ? 1 : 0.05);
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onMouse);
    this.scene.traverse((o) => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => { m?.map?.dispose?.(); m?.dispose?.(); });
    });
    this.renderer.dispose();
  }
}
