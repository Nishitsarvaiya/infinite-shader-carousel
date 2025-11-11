#define PI 3.1415926535897932384626433832795

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
    newPosition.z += sin((uv.x + uv.y) * 2.0 + uStrength * 2.0) * -uStrength;
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