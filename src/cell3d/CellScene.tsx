import * as THREE from 'three'
import { Suspense, lazy, memo, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bvh, CameraControls, Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import type { CellType } from '../data/organelles'
import { useViewer } from './viewerStore'
import { EventFilter, HighlightController, prewarmGhostPrograms } from './interaction'
import { ANIMAL_HOME } from './animalLayout'
import { PLANT_HOME } from './plantLayout'

const AnimalCell = lazy(() => import('./AnimalCell'))
const PlantCell = lazy(() => import('./PlantCell'))

const ANIMAL_BOUNDS: [number, number, number] = [11, 9.5, 10.5]
const PLANT_BOUNDS: [number, number, number] = [14, 8.5, 8.5]

interface Home {
  position: [number, number, number]
  target: [number, number, number]
}

/** Weicher Farbverlauf als Hintergrund. */
function Backdrop({ dark }: { dark: boolean }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 c1; uniform vec3 c2; varying vec2 vUv;
          void main() {
            float d = distance(vUv, vec2(0.5, 0.56));
            vec3 col = mix(c1, c2, smoothstep(0.0, 0.8, d));
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }
        `,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  )
  useEffect(() => {
    mat.uniforms.c1.value.set(dark ? '#1b2420' : '#fbfaf7')
    mat.uniforms.c2.value.set(dark ? '#0b0f0d' : '#e4dfd4')
  }, [dark, mat])
  return (
    <mesh frustumCulled={false} renderOrder={-1000} material={mat} raycast={() => null}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}

function CameraRig({ home: baseHome, boundary }: { home: Home; boundary: [number, number, number] }) {
  const ref = useRef<CameraControls>(null)
  const focus = useViewer((s) => s.focus)
  const reset = useViewer((s) => s.resetCounter)
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))

  // Bei schmalen (Hochformat-)Bühnen weiter herauszoomen, damit die ganze Zelle sichtbar ist
  const home = useMemo<Home>(() => {
    const f = Math.min(2.2, Math.max(1, 1.1 / aspect))
    const t = new THREE.Vector3(...baseHome.target)
    const p = new THREE.Vector3(...baseHome.position).sub(t).multiplyScalar(f).add(t)
    return { position: p.toArray() as [number, number, number], target: baseHome.target }
  }, [baseHome, aspect])

  useEffect(() => {
    ref.current?.setLookAt(...home.position, ...home.target, false)
  }, [home])

  // Drehpunkt bleibt immer in der Nähe der Zelle – sonst kann sie beim Verschieben/Zoomen „wegdriften“
  useEffect(() => {
    const b = boundary
    ref.current?.setBoundary(new THREE.Box3(new THREE.Vector3(-b[0], -b[1], -b[2]), new THREE.Vector3(b[0], b[1], b[2])))
  }, [boundary])

  useEffect(() => {
    const c = ref.current
    if (!focus || !c) return
    const target = new THREE.Vector3(...focus.target)
    let dir: THREE.Vector3
    if (focus.direction) dir = new THREE.Vector3(...focus.direction).normalize()
    else dir = c.getPosition(new THREE.Vector3()).sub(target).normalize()
    const cam = target.clone().addScaledVector(dir, focus.distance)
    c.setLookAt(cam.x, cam.y, cam.z, target.x, target.y, target.z, true)
  }, [focus])

  useEffect(() => {
    if (reset > 0) ref.current?.setLookAt(...home.position, ...home.target, true)
  }, [reset, home])

  // Sanftes Hin- und Herschwenken, damit die Schnittfläche im Blick bleibt
  const swing = useRef<{ base: number; t: number } | null>(null)
  useFrame((_, dt) => {
    const c = ref.current
    if (!c) return
    if (useViewer.getState().autoRotate) {
      if (!swing.current) swing.current = { base: c.azimuthAngle, t: 0 }
      swing.current.t += Math.min(dt, 0.05)
      c.rotateTo(swing.current.base + 0.62 * Math.sin(swing.current.t * 0.32), c.polarAngle, false)
    } else swing.current = null
  })

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={2.5}
      maxDistance={160}
      smoothTime={0.45}
      draggingSmoothTime={0.08}
      dollyToCursor
      onStart={() => useViewer.getState().set({ autoRotate: false })}
    />
  )
}

/**
 * Meldet, sobald die Zelle aufgebaut ist. Vorher werden (unter dem Lade-Hinweis)
 * die Shader für den Durchsicht-Modus einmal vorkompiliert.
 */
function ReadySignal({ onReady }: { onReady?: () => void }) {
  const frames = useRef(0)
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useFrame(() => {
    frames.current++
    if (frames.current === 2) {
      // Shader-Varianten für den Durchsicht-Modus im Hintergrund kompilieren
      prewarmGhostPrograms(true)
      gl.compileAsync(scene, camera).catch(() => undefined)
      prewarmGhostPrograms(false)
    }
    if (frames.current === 3) onReady?.()
  })
  return null
}

export default memo(CellScene)

function CellScene({ cell, dark, onReady }: { cell: CellType; dark: boolean; onReady?: () => void }) {
  const hq = useViewer((s) => s.hq)
  const home = cell === 'tier' ? ANIMAL_HOME : PLANT_HOME
  return (
    <Canvas
      dpr={hq ? [1, 2] : [1, 1.25]}
      camera={{ position: home.position, fov: 34, near: 0.1, far: 500 }}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.NeutralToneMapping }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true
      }}
    >
      <Backdrop dark={dark} />
      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#f6f3ec', '#3d3b33', 0.8]} />
      <directionalLight position={[14, 22, 12]} intensity={2.0} color="#fffaf0" />
      <directionalLight position={[-18, 6, -10]} intensity={0.7} color="#e6eee9" />
      <directionalLight position={[6, -14, 16]} intensity={0.45} color="#f4ece0" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={1.6} position={[0, 10, 8]} scale={[18, 6, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#e9efe9" position={[-12, 3, -6]} scale={[8, 8, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#f3ebdf" position={[12, -5, 6]} scale={[6, 6, 1]} />
      </Environment>
      <Suspense fallback={null}>
        <Bvh>{cell === 'tier' ? <AnimalCell /> : <PlantCell />}</Bvh>
        <ReadySignal onReady={onReady} />
      </Suspense>
      <HighlightController dark={dark} />
      <EventFilter />
      <CameraRig home={home} boundary={cell === 'tier' ? ANIMAL_BOUNDS : PLANT_BOUNDS} />
      {hq && (
        <EffectComposer multisampling={4} enableNormalPass={false}>
          <N8AO aoRadius={1.1} intensity={2.4} distanceFalloff={0.6} quality="medium" halfRes />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
