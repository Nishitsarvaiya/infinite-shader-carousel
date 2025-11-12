precision highp float;

uniform vec2 uImageSizes;
uniform vec2 uPlaneSizes;
uniform float uStrength;
uniform sampler2D tMap;

// from vertex
varying vec2 vUv;

void main() {
  // --- keep correct image aspect ratio ---
  vec2 ratio = vec2(
    min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
    min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
  );

  vec2 uv = vec2(
    vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
    vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
  );

  // --- chromatic aberration parameters ---
  // float strength = 0.003;          // 🔧 tweak: 0.001 subtle, 0.005 strong
  vec2 dir = normalize(uv - 0.5);  // radial direction from center

  // --- sample each channel with a slightly different UV offset ---
  vec3 color;
  color.r = texture2D(tMap, uv + dir * uStrength * 0.04).r;
  color.g = texture2D(tMap, uv).g;
  color.b = texture2D(tMap, uv - dir * uStrength * 0.04).b;

  gl_FragColor = vec4(color, 1.0);
}
