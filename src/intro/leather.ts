/**
 * Prozedurale, nahtlos kachelbare Ledernarbung (Worley-Rauschen + Licht),
 * gefärbt in mattem „Rolex-Grün“. Wird einmal beim Start als Kachel erzeugt.
 */

function mulberry32(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface LeatherOptions {
  size?: number
  cells?: number
  base?: [number, number, number]
  seed?: number
}

export function leatherTile({ size = 256, cells = 24, base = [16, 72, 51], seed = 11 }: LeatherOptions = {}): string {
  const rng = mulberry32(seed)
  // Merkmalspunkte auf periodischem Gitter
  const px = new Float32Array(cells * cells)
  const py = new Float32Array(cells * cells)
  for (let i = 0; i < cells * cells; i++) {
    px[i] = rng()
    py[i] = rng()
  }
  // feines, periodisches Werterauschen
  const G = 64
  const vn = new Float32Array(G * G)
  for (let i = 0; i < G * G; i++) vn[i] = rng()
  const valueNoise = (x: number, y: number) => {
    const fx = x * G
    const fy = y * G
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const tx = fx - x0
    const ty = fy - y0
    const sx = tx * tx * (3 - 2 * tx)
    const sy = ty * ty * (3 - 2 * ty)
    const i00 = vn[((y0 % G) + G) % G * G + (((x0 % G) + G) % G)]
    const i10 = vn[((y0 % G) + G) % G * G + ((((x0 + 1) % G) + G) % G)]
    const i01 = vn[((((y0 + 1) % G) + G) % G) * G + (((x0 % G) + G) % G)]
    const i11 = vn[((((y0 + 1) % G) + G) % G) * G + ((((x0 + 1) % G) + G) % G)]
    return (i00 * (1 - sx) + i10 * sx) * (1 - sy) + (i01 * (1 - sx) + i11 * sx) * sy
  }

  const h = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * cells
      const gy = (y / size) * cells
      const cx = Math.floor(gx)
      const cy = Math.floor(gy)
      let f1 = 9
      let f2 = 9
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const ix = (((cx + ox) % cells) + cells) % cells
          const iy = (((cy + oy) % cells) + cells) % cells
          const k = iy * cells + ix
          const dx = cx + ox + px[k] - gx
          const dy = cy + oy + py[k] - gy
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < f1) {
            f2 = f1
            f1 = d
          } else if (d < f2) f2 = d
        }
      }
      const edge = Math.min(1, (f2 - f1) / 0.32)
      const pebble = edge * edge * (3 - 2 * edge)
      const micro = valueNoise(x / size, y / size)
      h[y * size + x] = pebble * 0.82 + micro * 0.18
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const img = ctx.createImageData(size, size)
  const L = [-0.42, -0.58, 0.7]
  const ll = Math.hypot(L[0], L[1], L[2])
  const lx = L[0] / ll
  const ly = L[1] / ll
  const lz = L[2] / ll
  const S = 2.4
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size
      const xp = (x + 1) % size
      const ym = (y - 1 + size) % size
      const yp = (y + 1) % size
      const dx = (h[y * size + xp] - h[y * size + xm]) * S
      const dy = (h[yp * size + x] - h[ym * size + x]) * S
      const nl = Math.hypot(dx, dy, 1)
      const diff = (-dx * lx - dy * ly + lz) / nl
      const hv = h[y * size + x]
      const shade = (0.8 + (diff - lz) * 0.9) * (0.8 + 0.22 * hv)
      const i = (y * size + x) * 4
      img.data[i] = Math.max(0, Math.min(255, base[0] * shade))
      img.data[i + 1] = Math.max(0, Math.min(255, base[1] * shade))
      img.data[i + 2] = Math.max(0, Math.min(255, base[2] * shade))
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}
