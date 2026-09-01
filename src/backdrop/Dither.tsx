/**
 * Dithered wave backdrop, from React Bits (reactbits.dev), adapted.
 *
 * A domain-warped fbm noise field rendered to a fullscreen quad, then run
 * through a Bayer 8x8 ordered dither as a postprocessing pass, so the whole
 * thing quantises to `colorNum` levels of chunky dots.
 *
 * FOUR DELIBERATE CHANGES from the published source. Each is here because of
 * something about THIS site, so if you diff against upstream, this is the list:
 *
 *   1. TypeScript, not JavaScript. `npm run build` is `tsc --noEmit && vite
 *      build` and the tsconfig sets neither `allowJs` nor `checkJs`, so a .jsx
 *      module imported from App.tsx fails typecheck as an unresolvable module
 *      and takes the build down with it.
 *
 *   2. Mouse tracking listens on `window`, not on an invisible R3F plane. The
 *      upstream version raycasts a `visible={false}` mesh, which R3F's
 *      raycaster skips by default; and even if it did not, this canvas lives
 *      inside a `pointer-events: none` backdrop layer, so no pointer event can
 *      ever reach it. A window listener is the only path that works from behind
 *      the page, and it is cheaper than a raycast per move.
 *
 *   3. `prefers-reduced-motion` freezes the field. A perpetual full-viewport
 *      WebGL animation behind body text is exactly what that preference is for.
 *      Reduced motion holds the wave at its t=0 state rather than hiding it, so
 *      the page keeps its texture and only loses the movement.
 *
 *   4. The defaults are the site's palette rather than mid-grey, and they are
 *      deliberately dark. This sits under body copy set in `--color-clay`; a
 *      bright wave would quietly wreck the contrast the palette block in
 *      index.css was measured for.
 */
import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, wrapEffect } from '@react-three/postprocessing'
import { Effect } from 'postprocessing'
import * as THREE from 'three'

import './Dither.css'

type RGB = [number, number, number]

const waveVertexShader = /* glsl */ `
precision highp float;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;
}
`

const waveFragmentShader = /* glsl */ `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float waveSpeed;
uniform float waveFrequency;
uniform float waveAmplitude;
uniform vec3 waveColor;
uniform vec3 backgroundColor;
uniform vec2 mousePos;
uniform int enableMouseInteraction;
uniform float mouseRadius;

vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0,0.0,1.0,1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0,0.0,1.0,1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0/41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00,g00), dot(g01,g01), dot(g10,g10), dot(g11,g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

const int OCTAVES = 4;
float fbm(vec2 p) {
  float value = 0.0;
  float amp = 1.0;
  float freq = waveFrequency;
  for (int i = 0; i < OCTAVES; i++) {
    value += amp * abs(cnoise(p));
    p *= freq;
    amp *= waveAmplitude;
  }
  return value;
}

float pattern(vec2 p) {
  vec2 p2 = p - time * waveSpeed;
  return fbm(p + fbm(p2));
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  uv -= 0.5;
  uv.x *= resolution.x / resolution.y;
  float f = pattern(uv);
  if (enableMouseInteraction == 1) {
    vec2 mouseNDC = (mousePos / resolution - 0.5) * vec2(1.0, -1.0);
    mouseNDC.x *= resolution.x / resolution.y;
    float dist = length(uv - mouseNDC);
    float effect = 1.0 - smoothstep(0.0, mouseRadius, dist);
    f -= 0.5 * effect;
  }
  vec3 col = mix(backgroundColor, waveColor, clamp(f, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}
`

/**
 * `resolution` and `inputBuffer` are deliberately NOT declared here — the
 * postprocessing library injects both into every Effect's fragment shader, and
 * declaring them a second time is a redefinition error at shader compile time.
 */
const ditherFragmentShader = /* glsl */ `
precision highp float;
uniform float colorNum;
uniform float pixelSize;
const float bayerMatrix8x8[64] = float[64](
  0.0/64.0, 48.0/64.0, 12.0/64.0, 60.0/64.0,  3.0/64.0, 51.0/64.0, 15.0/64.0, 63.0/64.0,
  32.0/64.0,16.0/64.0, 44.0/64.0, 28.0/64.0, 35.0/64.0,19.0/64.0, 47.0/64.0, 31.0/64.0,
  8.0/64.0, 56.0/64.0,  4.0/64.0, 52.0/64.0, 11.0/64.0,59.0/64.0,  7.0/64.0, 55.0/64.0,
  40.0/64.0,24.0/64.0, 36.0/64.0, 20.0/64.0, 43.0/64.0,27.0/64.0, 39.0/64.0, 23.0/64.0,
  2.0/64.0, 50.0/64.0, 14.0/64.0, 62.0/64.0,  1.0/64.0,49.0/64.0, 13.0/64.0, 61.0/64.0,
  34.0/64.0,18.0/64.0, 46.0/64.0, 30.0/64.0, 33.0/64.0,17.0/64.0, 45.0/64.0, 29.0/64.0,
  10.0/64.0,58.0/64.0,  6.0/64.0, 54.0/64.0,  9.0/64.0,57.0/64.0,  5.0/64.0, 53.0/64.0,
  42.0/64.0,26.0/64.0, 38.0/64.0, 22.0/64.0, 41.0/64.0,25.0/64.0, 37.0/64.0, 21.0/64.0
);

vec3 dither(vec2 uv, vec3 color) {
  vec2 scaledCoord = floor(uv * resolution / pixelSize);
  int x = int(mod(scaledCoord.x, 8.0));
  int y = int(mod(scaledCoord.y, 8.0));
  float threshold = bayerMatrix8x8[y * 8 + x] - 0.25;
  float step = 1.0 / (colorNum - 1.0);
  color += threshold * step;
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float bias = mix(0.2, 0.0, smoothstep(0.45, 0.8, luminance));
  color = clamp(color - bias, 0.0, 1.0);
  return floor(color * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
}

void mainImage(in vec4 inputColor, in vec2 uv, out vec4 outputColor) {
  vec2 normalizedPixelSize = pixelSize / resolution;
  vec2 uvPixel = normalizedPixelSize * floor(uv / normalizedPixelSize);
  vec4 color = texture2D(inputBuffer, uvPixel);
  color.rgb = dither(uv, color.rgb);
  outputColor = color;
}
`

class RetroEffectImpl extends Effect {
  constructor() {
    super('RetroEffect', ditherFragmentShader, {
      uniforms: new Map<string, THREE.Uniform<number>>([
        ['colorNum', new THREE.Uniform(4.0)],
        ['pixelSize', new THREE.Uniform(2.0)],
      ]),
    })
  }

  private uniform(name: string): THREE.Uniform<number> {
    return this.uniforms.get(name) as unknown as THREE.Uniform<number>
  }

  set colorNum(v: number) {
    this.uniform('colorNum').value = v
  }
  get colorNum(): number {
    return this.uniform('colorNum').value
  }
  set pixelSize(v: number) {
    this.uniform('pixelSize').value = v
  }
  get pixelSize(): number {
    return this.uniform('pixelSize').value
  }
}

/**
 * wrapEffect turns the raw postprocessing Effect into something
 * <EffectComposer> accepts as a child, and forwards leftover props onto the
 * instance — which is what makes the colorNum/pixelSize setters above fire.
 */
const RetroEffect = wrapEffect(RetroEffectImpl)

/**
 * True when the visitor has asked the OS for less motion. Read live rather than
 * once, because the setting can change while the page is open and a background
 * that keeps moving after the preference flips is the bug this guards against.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

type WavesProps = Required<Omit<DitherProps, 'className'>>

function DitheredWaves({
  waveSpeed,
  waveFrequency,
  waveAmplitude,
  waveColor,
  backgroundColor,
  colorNum,
  pixelSize,
  disableAnimation,
  enableMouseInteraction,
  mouseRadius,
}: WavesProps) {
  const mouseRef = useRef(new THREE.Vector2())
  const { viewport, size, gl } = useThree()

  const uniformsRef = useRef({
    time: new THREE.Uniform(0),
    resolution: new THREE.Uniform(new THREE.Vector2(0, 0)),
    waveSpeed: new THREE.Uniform(waveSpeed),
    waveFrequency: new THREE.Uniform(waveFrequency),
    waveAmplitude: new THREE.Uniform(waveAmplitude),
    waveColor: new THREE.Uniform(new THREE.Color(...waveColor)),
    backgroundColor: new THREE.Uniform(new THREE.Color(...backgroundColor)),
    mousePos: new THREE.Uniform(new THREE.Vector2(0, 0)),
    enableMouseInteraction: new THREE.Uniform(enableMouseInteraction ? 1 : 0),
    mouseRadius: new THREE.Uniform(mouseRadius),
  })

  useEffect(() => {
    const dpr = gl.getPixelRatio()
    const res = uniformsRef.current.resolution.value
    res.set(Math.floor(size.width * dpr), Math.floor(size.height * dpr))
  }, [size, gl])

  /*
   * See change 2 in the file header: the canvas sits under a pointer-events:none
   * layer, so it can never receive a pointer event of its own. Tracking on the
   * window is the only thing that works, and the coordinates still have to be
   * expressed relative to the canvas, because that is the space `resolution` is
   * measured in.
   */
  useEffect(() => {
    if (!enableMouseInteraction) return
    const onMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      const dpr = gl.getPixelRatio()
      mouseRef.current.set((e.clientX - rect.left) * dpr, (e.clientY - rect.top) * dpr)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [enableMouseInteraction, gl])

  const prevColor = useRef<RGB>([...waveColor])
  const prevBackground = useRef<RGB>([...backgroundColor])

  useFrame(({ clock }) => {
    const u = uniformsRef.current

    if (!disableAnimation) u.time.value = clock.getElapsedTime()

    u.waveSpeed.value = waveSpeed
    u.waveFrequency.value = waveFrequency
    u.waveAmplitude.value = waveAmplitude

    // Colours are compared rather than assigned every frame because `.setRGB()`
    // on a THREE.Color is not free and these change roughly never.
    if (!prevColor.current.every((v, i) => v === waveColor[i])) {
      u.waveColor.value.setRGB(...waveColor)
      prevColor.current = [...waveColor]
    }
    if (!prevBackground.current.every((v, i) => v === backgroundColor[i])) {
      u.backgroundColor.value.setRGB(...backgroundColor)
      prevBackground.current = [...backgroundColor]
    }

    u.enableMouseInteraction.value = enableMouseInteraction ? 1 : 0
    u.mouseRadius.value = mouseRadius
    if (enableMouseInteraction) u.mousePos.value.copy(mouseRef.current)
  })

  return (
    <>
      <mesh scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          vertexShader={waveVertexShader}
          fragmentShader={waveFragmentShader}
          uniforms={uniformsRef.current}
        />
      </mesh>

      <EffectComposer>
        <RetroEffect colorNum={colorNum} pixelSize={pixelSize} />
      </EffectComposer>
    </>
  )
}

export type DitherProps = {
  /** Speed of the wave animation. */
  waveSpeed?: number
  /** Frequency of the wave pattern. */
  waveFrequency?: number
  /** Amplitude of the wave pattern. */
  waveAmplitude?: number
  /** Wave colour as RGB, 0..1 per channel. */
  waveColor?: RGB
  /** Base canvas colour behind the dithered waves, RGB 0..1. */
  backgroundColor?: RGB
  /** Number of quantisation levels in the dither. */
  colorNum?: number
  /** Size of one dither dot, in device pixels. */
  pixelSize?: number
  /** Hold the wave still. Forced on under prefers-reduced-motion. */
  disableAnimation?: boolean
  /** Let the pointer push a dip into the field. */
  enableMouseInteraction?: boolean
  /** Radius of the pointer's influence, in the shader's uv space. */
  mouseRadius?: number
  className?: string
}

export default function Dither({
  waveSpeed = 0.05,
  waveFrequency = 3,
  waveAmplitude = 0.3,
  /*
   * NOT the upstream mid-grey. These are the site's own values: the ground is
   * --color-ink #08080a, and the wave is a cool near-black a few steps above
   * it, cool because --color-glow is the only hue in the palette that is not
   * the ground. Kept this dark on purpose — body copy over this is
   * --color-clay #8a8a92, and a brighter wave spends contrast that the palette
   * block in index.css was measured for.
   */
  waveColor = [0.145, 0.152, 0.19],
  backgroundColor = [0.031, 0.031, 0.039],
  colorNum = 4,
  pixelSize = 2,
  disableAnimation = false,
  enableMouseInteraction = true,
  mouseRadius = 0.35,
  className = 'dither-container',
}: DitherProps) {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <Canvas
      className={className}
      camera={{ position: [0, 0, 6] }}
      /*
       * dpr={1} is not a default worth changing. This shader is four octaves of
       * Perlin noise evaluated twice per fragment, so cost is linear in pixels;
       * letting it run at a retina ratio quadruples that for a texture that is
       * then quantised down to four tones anyway.
       */
      dpr={1}
      gl={{ antialias: false, preserveDrawingBuffer: false }}
    >
      <DitheredWaves
        waveSpeed={waveSpeed}
        waveFrequency={waveFrequency}
        waveAmplitude={waveAmplitude}
        waveColor={waveColor}
        backgroundColor={backgroundColor}
        colorNum={colorNum}
        pixelSize={pixelSize}
        disableAnimation={disableAnimation || reducedMotion}
        enableMouseInteraction={enableMouseInteraction && !reducedMotion}
        mouseRadius={mouseRadius}
      />
    </Canvas>
  )
}
