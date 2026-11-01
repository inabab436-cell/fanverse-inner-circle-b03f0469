import { useEffect, useMemo } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import boyModel from "@/assets/models/human-boy.glb.asset.json";
import girlModel from "@/assets/models/human-girl.glb.asset.json";
import boyHair from "@/assets/models/hair-boy.glb.asset.json";
import girlHair from "@/assets/models/hair-girl.glb.asset.json";
import animsFile from "@/assets/models/human-anims.glb.asset.json";
import printAsset from "@/assets/elissa_shirt_print.jpg.asset.json";
import { OUTFIT, type Gender } from "@/lib/avatar";
import { boneRegion, CLIP_FILE, type Region } from "@/lib/locomotion";

export const AVATAR_HEIGHT = 1.68; // metres
const BODY = { boy: boyModel.url, girl: girlModel.url };
const HAIR = { boy: boyHair.url, girl: girlHair.url };
/** Slimmer than the source's superhero build, for a teen look. */
const BUILD: Record<Gender, [number, number]> = { boy: [0.88, 0.9], girl: [0.9, 0.92] }; // [width, depth]

const REGION_COLOR: Record<Exclude<Region, "skin">, string> = { tee: OUTFIT.tee, jeans: OUTFIT.jeans, shoes: OUTFIT.shoes };

/** Paint the outfit per vertex from the bone that moves it most (bind-pose skin weights). */
function dress(mesh: THREE.SkinnedMesh) {
  const geo = mesh.geometry.clone();
  const idx = geo.getAttribute("skinIndex"), wt = geo.getAttribute("skinWeight");
  const bones = mesh.skeleton.bones;
  const cloth = new Float32Array(idx.count * 4);
  const col = new THREE.Color();
  for (let i = 0; i < idx.count; i++) {
    let best = 0, bw = -1;
    for (let k = 0; k < 4; k++) { const w = wt.getComponent(i, k); if (w > bw) { bw = w; best = idx.getComponent(i, k); } }
    const region = boneRegion(bones[best]?.name ?? "");
    if (region === "skin") continue;
    col.set(REGION_COLOR[region]);
    const n = region === "jeans" ? 0.9 + ((i * 7919) % 17) / 85 : 1; // faint denim grain
    cloth[i * 4] = col.r * n; cloth[i * 4 + 1] = col.g * n; cloth[i * 4 + 2] = col.b * n; cloth[i * 4 + 3] = 1;
  }
  geo.setAttribute("cloth", new THREE.BufferAttribute(cloth, 4));
  mesh.geometry = geo;
  const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec4 cloth;\nvarying vec4 vCloth;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvCloth = cloth;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec4 vCloth;")
      .replace("#include <map_fragment>", "#include <map_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vCloth.rgb, vCloth.a);")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.85, vCloth.a);");
  };
  mat.customProgramCacheKey = () => "outfit";
  mesh.material = mat;
}

/** Re-attach a hair mesh exported with its own skeleton onto the body's bones, by name. */
function attachHair(body: THREE.Object3D, hairScene: THREE.Object3D) {
  const hair = SkeletonUtils.clone(hairScene);
  const byName = new Map<string, THREE.Bone>();
  body.traverse((o) => { if ((o as THREE.Bone).isBone) byName.set(o.name, o as THREE.Bone); });
  const meshes: THREE.Mesh[] = [];
  hair.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
  for (const m of meshes) {
    m.castShadow = true;
    const sk = m as THREE.SkinnedMesh;
    if (sk.isSkinnedMesh) {
      const bones = sk.skeleton.bones.map((b) => byName.get(b.name) ?? b);
      const host = body.getObjectByProperty("type", "SkinnedMesh") as THREE.SkinnedMesh | undefined;
      host?.parent?.add(sk);
      sk.bind(new THREE.Skeleton(bones, sk.skeleton.boneInverses), sk.bindMatrix);
    } else {
      const head = byName.get("Head");
      if (head) { const parent = m.parent?.name ? byName.get(m.parent.name) ?? head : head; parent.add(m); }
    }
  }
}

/** Cloned, dressed, rigged avatar scaled to AVATAR_HEIGHT with feet at y=0, plus its clips. */
export function useAvatar(g: Gender) {
  const body = useGLTF(BODY[g]);
  const hair = useGLTF(HAIR[g]);
  const anims = useGLTF(animsFile.url);
  const print = useTexture(printAsset.url);
  const animations = useMemo(() => {
    const keep = new Set(Object.values(CLIP_FILE));
    return anims.animations.filter((a) => keep.has(a.name)).map((a) => {
      const c = a.clone();
      // rotations retarget cleanly across builds; only the pelvis keeps its translation
      c.tracks = c.tracks.filter((t) => !t.name.endsWith(".scale") && (!t.name.endsWith(".position") || t.name.startsWith("pelvis.")));
      return c;
    });
  }, [anims.animations]);
  const obj = useMemo(() => {
    const clone = SkeletonUtils.clone(body.scene) as THREE.Object3D;
    clone.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isMesh) return;
      m.castShadow = true; m.frustumCulled = false;
      if (m.isSkinnedMesh && /superhero/i.test(m.name + (m.parent?.name ?? "") + ((m.material as THREE.Material).name ?? ""))) dress(m);
      else m.material = (m.material as THREE.Material).clone();
    });
    attachHair(clone, hair.scene);
    const box = new THREE.Box3().setFromObject(clone);
    const h = box.max.y - box.min.y || 1;
    const s = AVATAR_HEIGHT / h;
    clone.scale.set(s * BUILD[g][0], s, s * BUILD[g][1]);
    clone.position.y = -box.min.y * s;
    const chest = clone.getObjectByName("spine_03");
    if (chest) {
      print.colorSpace = THREE.SRGBColorSpace;
      const size = 0.24;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: print, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -4 }));
      plane.name = "shirt-print";
      chest.add(plane);
      // place on the chest surface in avatar space, then convert into the bone's frame
      clone.updateMatrixWorld(true);
      const front = new THREE.Vector3(0, PRINT[g].y, PRINT[g].z).applyMatrix4(clone.matrixWorld);
      chest.worldToLocal(plane.position.copy(front));
      const q = chest.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(clone.getWorldQuaternion(new THREE.Quaternion()));
      plane.quaternion.copy(q);
      const ws = chest.getWorldScale(new THREE.Vector3());
      plane.scale.set(size / ws.x, size / ws.y, 1 / ws.z);
    }
    return clone;
  }, [body.scene, hair.scene, g, print]);
  useEffect(() => () => { obj.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) (m.material as THREE.Material).dispose(); }); }, [obj]);
  return { obj, animations };
}

/** Chest print centre in unscaled model units (source height ≈ 1.8). */
export const PRINT: Record<Gender, { y: number; z: number }> = { boy: { y: 1.3, z: 0.16 }, girl: { y: 1.27, z: 0.15 } };

useGLTF.preload(boyModel.url);
useGLTF.preload(girlModel.url);
useGLTF.preload(boyHair.url);
useGLTF.preload(girlHair.url);
useGLTF.preload(animsFile.url);
