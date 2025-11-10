#define PI 3.1415926535897932384626433832795

precision highp float;
precision highp int;

uniform float uStrength;
uniform vec2 uViewportSizes;

varying vec2 vUv;

void main() {
  vec4 newPosition = modelViewMatrix * vec4(position, 1.0);

  newPosition.z += cos(newPosition.x / uViewportSizes.x * PI + PI / 2.5) * -uStrength;

  vUv = uv;
  // newPosition.x += cos(uv.y * PI) * -uStrength;
  // newPosition.y += abs(cos(newPosition.x / uViewportSizes.x * PI + PI / 2.0)) * uStrength * 2.0;
  newPosition.x += abs(sin(newPosition.x / uViewportSizes.x * PI + PI / 2.0)) * uStrength * 2.0;

  gl_Position = projectionMatrix * newPosition;
}