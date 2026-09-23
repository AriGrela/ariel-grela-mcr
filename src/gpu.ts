/** What the browser reports about the GPU it uses for WebGL. */
export interface GpuInfo {
  webgl: boolean
  renderer: string
  /** WebGL is being emulated on the CPU (hardware acceleration off, blocklisted driver…). */
  software: boolean
}

const SOFTWARE = /swiftshader|llvmpipe|softpipe|basic render|software|microsoft basic/i

let cached: GpuInfo | null = null

export function gpuInfo(): GpuInfo {
  if (cached) return cached
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return (cached = { webgl: false, renderer: 'none', software: false })
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return (cached = { webgl: true, renderer, software: SOFTWARE.test(renderer) })
  } catch {
    return (cached = { webgl: false, renderer: 'error', software: false })
  }
}
