/**
 * Matte, aufeinander abgestimmte Organellfarben – eine Quelle für 3D, 2D, Legende und Lexikon.
 * base = Hauptfarbe (Legende), dark = Kontur, light = Füllung/Innenraum.
 */
export const P = {
  membran: { base: '#d58d9c', dark: '#b06b7c', light: '#f0dade', tail: '#ecdfc2' },
  cyto: { base: '#a9c7c3', inner3d: '#e2ebe7', light: '#f3f6f3', mid: '#e5ede9', edge: '#d4e1dc' },
  kern: { base: '#7a6cb2', envelope: '#6b5da7', inner: '#8b7ec3', plasma: '#dcd6ec', plasmaLight: '#ece9f5', plasmaEdge: '#d0c8e6', cap: '#574a92' },
  poren: { base: '#cdc4e9', dark: '#a79bd4' },
  nucleolus: { base: '#433879', light: '#5f529f', dots: '#8074b7' },
  chromatin: { base: '#9b8fcd', hetero: '#8174bb' },
  rer: { base: '#5b7eb5', dark: '#445f95', lumen: '#d3def0' },
  ser: { base: '#4f98a0', dark: '#37757c', lumen: '#d1e6e8' },
  ribo: { base: '#3d3a69' },
  golgi: { base: '#cfa24f', dark: '#a98334', lumen: '#f4e6c6' },
  vesikel: { base: '#e3cb8d', dark: '#bb9b58' },
  mito: { base: '#cf7f58', dark: '#a65e3d', inner: '#f2dccf', crista: '#e1a080', shell3d: '#d98d66', back3d: '#a85a38' },
  lyso: { base: '#ad6282', dark: '#854663', dots: '#ecd4de', back3d: '#743b55' },
  perox: { base: '#a3b764', dark: '#798b42', core: '#879a45', back3d: '#5f6f30' },
  zentro: { base: '#c2625a', dark: '#99453e', light: '#e8aaa4' },
  skelett: { base: '#8f9aad', mt: '#8a98b0', actin: '#a0aabd', inter: '#c8bea8' },
  wand: { base: '#9db77b', dark: '#6e8a50', light: '#c8d8b1', lamella: '#5e7942', fibril: '#88a266' },
  plasmo: { base: '#6e8a50' },
  vakuole: { base: '#8cbad4', dark: '#5a8fae', light: '#e8f2f8', mid: '#d0e4ef' },
  chloro: { base: '#5a9c61', dark: '#3b7343', env: '#d3e8cd', stroma: '#b2d5a8', grana: '#2f6437', lamella: '#428649', starch: '#f3efe1' },
} as const
