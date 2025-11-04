import './style.css';

import { DoubleSide, Mesh, OrthographicCamera, PlaneGeometry, SRGBColorSpace, Scene, ShaderMaterial, Vector4, WebGLRenderer } from 'three';
import fragment from './shaders/fragment.glsl';
import vertex from './shaders/vertex.glsl';

export default class Sketch {
	constructor(options) {
		this.scene = new Scene();
		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor(0x121212, 1);
		this.renderer.physicallyCorrectLights = true;
		this.renderer.outputColorSpace = SRGBColorSpace;

		this.container.appendChild(this.renderer.domElement);

		// this.camera = new PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
		var frustumSize = this.height;
		var aspect = this.width / this.height;
		this.camera = new OrthographicCamera(
			(frustumSize * aspect) / -2,
			(frustumSize * aspect) / 2,
			frustumSize / 2,
			frustumSize / -2,
			-1000,
			1000
		);
		this.camera.position.set(0, 0, 2);
		// this.controls = new OrbitControls(this.camera, this.renderer.domElement);

		this.time = 0;
		this.mouse = {
			x: 0,
			y: 0,
			prevX: 0,
			prevY: 0,
			vX: 0,
			vY: 0,
		};

		this.isPlaying = true;
		this.addObjects();
		this.resize();
		this.render();
		this.setupResize();
		this.mouseEvents();
	}

	mouseEvents() {
		window.addEventListener('mousemove', (e) => {
			this.mouse.prevX = this.mouse.x;
			this.mouse.prevY = this.mouse.y;
			this.mouse.x = e.clientX - this.width / 2;
			this.mouse.y = this.height / 2 - e.clientY;
			this.mouse.vX = this.mouse.x - this.mouse.prevX;
			this.mouse.vY = this.mouse.y - this.mouse.prevY;
		});
	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this));
	}

	resize() {
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer.setSize(this.width, this.height);
		this.camera.aspect = this.width / this.height;

		// image cover
		this.imageAspect = 2400 / 1920;
		let a1;
		let a2;
		if (this.height / this.width > this.imageAspect) {
			a1 = (this.width / this.height) * this.imageAspect;
			a2 = 1;
		} else {
			a1 = 1;
			a2 = this.height / this.width / this.imageAspect;
		}

		this.material.uniforms.resolution.value.x = this.width;
		this.material.uniforms.resolution.value.y = this.height;
		this.material.uniforms.resolution.value.z = a1;
		this.material.uniforms.resolution.value.w = a2;

		this.camera.updateProjectionMatrix();
	}

	addObjects() {
		this.material = new ShaderMaterial({
			extensions: {
				derivatives: '#extension GL_OES_standard_derivatives : enable',
			},
			side: DoubleSide,
			uniforms: {
				time: {
					value: 0,
				},
				resolution: {
					value: new Vector4(),
				},
			},
			vertexShader: vertex,
			fragmentShader: fragment,
		});

		this.geometry = new PlaneGeometry(this.width, this.height, 1, 1);
		this.plane = new Mesh(this.geometry, this.material);
		this.scene.add(this.plane);
	}

	render() {
		if (!this.isPlaying) return;
		this.time += 0.05;
		this.material.uniforms.time.value = this.time;
		requestAnimationFrame(this.render.bind(this));
		this.renderer.render(this.scene, this.camera);
	}
}

new Sketch({
	dom: document.getElementById('app'),
});
