uniform float time;

uniform vec4 resolution;
varying vec2 vUv;
varying vec3 vPosition;

uniform sampler2D uTexture;
uniform sampler2D uDisplacement;
float PI = 3.141592653589793238;

void main()	{
	gl_FragColor = vec4(vUv, 1.0, 1.0);
}