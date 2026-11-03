import { useEffect, useMemo } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import printAsset from "@/assets/elissa_shirt_print.jpg.asset.json";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import boyModel from "@/assets/models/avatar-boy.glb.asset.json";
import girlModel from "@/assets/models/avatar-girl.glb.asset.json";
import customModel from "@/assets/models/avatar-custom.glb.asset.json";
import { UNIFORM_CELLS, type Gender } from "@/lib/avatar";

export const AVATAR_HEIGHT = 1.45; // metres
/** Chest print placement in metres relative to the torso bone. */
export const PRINT = { size: 0.3, y: { boy: 0.22, girl: 0.22, custom: 0 } as Record<Gender, number>, z: { boy: 0.3, girl: 0.3, custom: 0 } as Record<Gender, number> };
export const modelUrl = (g: Gender) => (g === "custom" ? customModel.url : g === "boy" ? boyModel.url : girlModel.url);

function uniformTexture(src: THREE.Texture, g: Gender) {
  const img = src.image as CanvasImageSource & { width: number; height: number };
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const ctx = c.getContext("2d")!; ctx.drawImage(img, 0, 0);
  const cw = img.width / 16, ch = img.height / 8;
  for (const cell of UNIFORM_CELLS[g]) {
    const d = ctx.getImageData(cell.col * cw, cell.row * ch, cw, ch);
    const t = new THREE.Color(cell.color);
    let avg = 0; for (let i = 0; i < d.data.length; i += 4) avg += d.data[i]! + d.data[i + 1]! + d.data[i + 2]!;
    avg = avg / (d.data.length / 4) || 1;
    for (let i = 0; i < d.data.length; i += 4) {
      const k = Math.min(1.4, (d.data[i]! + d.data[i + 1]! + d.data[i + 2]!) / avg);
      d.data[i] = Math.min(255, t.r * 255 * k); d.data[i + 1] = Math.min(255, t.g * 255 * k); d.data[i + 2] = Math.min(255, t.b * 255 * k);
    }
    ctx.putImageData(d, cell.col * cw, cell.row * ch);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = src.flipY; tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  return tex;
}

/** Cloned, uniform-dressed avatar scaled to AVATAR_HEIGHT with feet at y=0. */
export function useAvatar(g: Gender) {
  const { scene, animations } = useGLTF(modelUrl(g));
  const print = useTexture(printAsset.url);
  const obj = useMemo(() => {
    const clone = SkeletonUtils.clone(scene) as THREE.Object3D;
    let tex: THREE.Texture | null = null;
    clone.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      if (mat.map && g !== "custom") { tex ??= uniformTexture(mat.map, g); mat.map = tex; }
      mat.roughness = 0.7;
      m.material = mat;
    });
    const box = new THREE.Box3().setFromObject(clone);
    const h = box.max.y - box.min.y || 1;
    const s = AVATAR_HEIGHT / h;
    clone.scale.setScalar(s);
    clone.position.x = -(box.min.x + box.max.x) * 0.5 * s;
    clone.position.z = -(box.min.z + box.max.z) * 0.5 * s;
    clone.position.y = -box.min.y * s;
    // Elissa print on the chest, attached to the torso bone so it follows the animation
    const torso = clone.getObjectByName("torso");
    if (torso && g !== "custom") {
      print.colorSpace = THREE.SRGBColorSpace;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(PRINT.size / s, PRINT.size / s), new THREE.MeshStandardMaterial({ map: print, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2 }));
      plane.position.set(0, PRINT.y[g] / s, PRINT.z[g] / s);
      plane.name = "shirt-print";
      torso.add(plane);
    }
    return clone;
  }, [scene, g, print]);
  useEffect(() => () => { obj.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) (m.material as THREE.Material).dispose(); }); }, [obj]);
  return { obj, animations };
}

useGLTF.preload(boyModel.url);
useGLTF.preload(girlModel.url);
useGLTF.preload(customModel.url);
