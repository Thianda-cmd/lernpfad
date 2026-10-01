import * as THREE from 'three'

type StdParams = THREE.MeshStandardMaterialParameters
type PhysParams = THREE.MeshPhysicalMaterialParameters

/** Matte Oberfläche (Standard für Organellen). */
export function matte(color: THREE.ColorRepresentation, params: StdParams = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...params })
}

/** Seidenmatt – ein Hauch Glanz für Membranen. */
export function satin(color: THREE.ColorRepresentation, params: PhysParams = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.6, ...params })
}

/** Durchscheinende Hülle (z. B. äußere Mitochondrienmembran). */
export function veil(color: THREE.ColorRepresentation, opacity: number, params: PhysParams = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.45,
    metalness: 0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.5,
    transparent: true,
    opacity,
    depthWrite: false,
    ...params,
  })
}
