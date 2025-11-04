uniform float time;

varying vec2 vUv;
varying vec3 vPosition;

uniform sampler2D uTexture;
uniform sampler2D uDisplacement;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}