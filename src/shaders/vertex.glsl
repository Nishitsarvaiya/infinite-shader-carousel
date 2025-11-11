#define PI 3.1415926535897932384626433832795
#define RADIUS 0.35

precision highp float;
precision highp int;

uniform float uStrength;
uniform vec2 uViewportSizes;
uniform int uMode;

varying vec2 vUv;

void main() {
  vec4 newPosition = modelViewMatrix * vec4(position, 1.0);

  vUv = uv;

  // Mode 0 — your current distortion
  if (uMode == 0) {
    newPosition.z += cos(newPosition.x / uViewportSizes.x * PI + PI / 2.5) * -uStrength;
    newPosition.x += abs(sin(newPosition.x / uViewportSizes.x * PI + PI / 2.0)) * uStrength * 2.0;
  }

  // Mode 1 — wave ripple
  if (uMode == 1) {
    float wave = sin((uv.x + uv.y) * 2.0 + uStrength * 2.0);
    newPosition.z += wave * uStrength;
  }

  // Mode 2 — liquid melt
  if (uMode == 2) {
    newPosition.x += sin(uv.y * PI) * -uStrength * 0.5;
    // newPosition.y += cos(uv.y * PI) * -uStrength * 0.5;
  }

  // Mode 3 — spherical bulge
  if (uMode == 3) {
    float d = distance(uv, vec2(0.5));
    newPosition.z += (1.0 - d) * uStrength * 2.0;
  }

  if (uMode == 4) {
    float shear = sin(uv.x * PI * 2.0) * uStrength * 0.5;
    newPosition.x += shear;
    newPosition.z += shear;
  }

  if (uMode == 5) {
    float n = fract(sin(dot(uv * 50.0, vec2(12.9898, 78.233))) * 43758.5453);
    newPosition.x += (n - 0.5) * uStrength * 0.5;
    newPosition.y += (n - 0.5) * uStrength * 0.5;
    newPosition.z += (n - 0.5) * uStrength * 0.5;
  }

  if (uMode == 6) {
    float crease = smoothstep(0.48, 0.52, uv.x);
    newPosition.z += (crease - 0.5) * uStrength * 2.0;
  }

  if (uMode == 7) {
    vec2 p = uv - 0.5;
    float angle = uStrength * 2.0;
    float s = sin(angle);
    float c = cos(angle);

    // rotate the position around center
    vec2 rotated = vec2(
      p.x * c - p.y * s,
      p.x * s + p.y * c
    );

    newPosition.x += (rotated.x - p.x) * 1.5;
    newPosition.y += (rotated.y - p.y) * 1.5;
    float d = distance(uv, vec2(0.5));
    newPosition.z += abs((1.0 - d) * uStrength * 2.0);
  }


  if (uMode == 8) {
    float d = distance(uv, vec2(0.5));
    float pulse = sin(d * 5.0 + uStrength * 5.0);

    newPosition.z += pulse * uStrength * 2.0;
  }

  if (uMode == 9) {
    float cx = fract(uv.x * 50.0 + uStrength * 5.0);
    float cy = fract(uv.y * 50.0 + uStrength * 5.0);

    float cell = abs(cx - 0.5) + abs(cy - 0.5);

    newPosition.z += (0.5 - cell) * uStrength * 2.0;
  }
  
  if (uMode == 10) {
    float t = newPosition.x / uViewportSizes.x * PI;

    newPosition.z += cos(t * 1.25) * uStrength * 2.0;
    newPosition.y += sin(t * 0.75) * uStrength * 1.2;
  }

  if (uMode == 11) {
    float t = newPosition.x / uViewportSizes.x * PI;

    newPosition.x += sin(t * 1.5) * uStrength * 2.5;
    newPosition.z += -cos(t * 2.0) * uStrength * 1.5;
  }

  gl_Position = projectionMatrix * newPosition;
}


// void main() {
//   vec4 newPosition = modelViewMatrix * vec4(position, 1.0);

//   newPosition.z += cos(newPosition.x / uViewportSizes.x * PI + PI / 2.5) * -uStrength;

//   vUv = uv;
//   // newPosition.x += cos(uv.y * PI) * -uStrength;
//   // newPosition.y += abs(cos(newPosition.x / uViewportSizes.x * PI + PI / 2.0)) * uStrength * 2.0;
//   newPosition.x += abs(sin(newPosition.x / uViewportSizes.x * PI + PI / 2.0)) * uStrength * 2.0;

//   gl_Position = projectionMatrix * newPosition;
// }