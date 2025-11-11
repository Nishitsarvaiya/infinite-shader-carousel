import normalizeWheel from 'normalize-wheel';
import Media from './modules/Media';

import { PerspectiveCamera, PlaneGeometry, SRGBColorSpace, Scene, WebGLRenderer } from 'three';
import { lerp } from './utils';

export default class Sketch {
	constructor(options) {
		this.scene = new Scene();
		this.container = options.dom;
		this.screen = {
			width: this.container.offsetWidth,
			height: this.container.offsetHeight,
		};
		this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(this.screen.width, this.screen.height);
		this.renderer.setClearColor(0xffffff, 1);
		this.renderer.physicallyCorrectLights = true;
		this.renderer.outputColorSpace = SRGBColorSpace;

		this.container.appendChild(this.renderer.domElement);

		const fov = 45;
		const aspect = window.innerWidth / window.innerHeight;
		const near = 0.1;
		const far = 100;

		this.camera = new PerspectiveCamera(fov, aspect, near, far);
		this.camera.position.z = 5;
		// this.controls = new OrbitControls(this.camera, this.renderer.domElement);

		this.time = 0;
		this.scroll = {
			ease: 0.08,
			current: 0,
			target: 0,
			last: 0,
		};

		this.isPlaying = true;
		this.createGallery();
		this.onResize();
		this.createGeometry();
		this.createMedias();
		this.render();
		this.eventListeners();
	}

	createGallery() {
		this.gallery = document.querySelector('.carousel');
	}

	createGeometry() {
		this.planeGeometry = new PlaneGeometry(1, 1, 512, 512);
	}

	createMedias() {
		this.mediaEls = document.querySelectorAll('.carousel__figure');
		this.medias = Array.from(this.mediaEls).map(
			(el) =>
				new Media({
					el,
					geometry: this.planeGeometry,
					scene: this.scene,
					renderer: this.renderer,
					screen: this.screen,
					viewport: this.viewport,
					width: this.galleryWidth,
				})
		);
	}

	eventListeners() {
		window.addEventListener('resize', this.onResize.bind(this));
		window.addEventListener('mousewheel', this.onWheel.bind(this));
		window.addEventListener('wheel', this.onWheel.bind(this));

		window.addEventListener('mousedown', this.onTouchDown.bind(this));
		window.addEventListener('mousemove', this.onTouchMove.bind(this));
		window.addEventListener('mouseup', this.onTouchUp.bind(this));

		window.addEventListener('touchstart', this.onTouchDown.bind(this));
		window.addEventListener('touchmove', this.onTouchMove.bind(this));
		window.addEventListener('touchend', this.onTouchUp.bind(this));

		const buttons = document.querySelectorAll('.demo-btn');

		document.querySelectorAll('[data-mode]').forEach((btn) => {
			btn.addEventListener('click', () => {
				const mode = Number(btn.dataset.mode);

				// Set uniform for all medias
				this.medias.forEach((media) => {
					media.material.uniforms.uMode.value = mode;
				});

				// Update active state
				buttons.forEach((b) => b.classList.remove('is-active'));
				btn.classList.add('is-active');
			});
		});
	}

	onWheel(e) {
		const normalized = normalizeWheel(e);
		const speed = normalized.pixelY;

		this.scroll.target += speed * 0.8;
	}

	onTouchDown(event) {
		this.isDown = true;

		this.scroll.position = this.scroll.current;
		this.start = event.touches ? event.touches[0].clientX : event.clientX;
	}

	onTouchMove(event) {
		if (!this.isDown) return;

		const x = event.touches ? event.touches[0].clientX : event.clientX;
		const distance = (this.start - x) * 2;

		this.scroll.target = this.scroll.position + distance;
	}

	onTouchUp() {
		this.isDown = false;
	}

	onResize() {
		this.screen = {
			width: this.container.offsetWidth,
			height: this.container.offsetHeight,
		};

		this.renderer.setSize(this.screen.width, this.screen.height);

		this.camera.aspect = this.screen.width / this.screen.height;
		this.camera.updateProjectionMatrix();

		// Equivalent of OGL viewport math
		const fov = this.camera.fov * (Math.PI / 180);
		const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
		const width = height * this.camera.aspect;

		this.viewport = {
			width: width,
			height: height,
		};

		this.galleryBounds = this.gallery.getBoundingClientRect();
		this.galleryWidth = (this.viewport.width * this.galleryBounds.width) / this.screen.width;

		if (this.medias) {
			this.medias.forEach((media) =>
				media.onResize({
					width: this.galleryWidth,
					screen: this.screen,
					viewport: this.viewport,
				})
			);
		}
	}

	render() {
		if (!this.isPlaying) return;
		this.time += 0.05;

		this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);

		// Compute velocity
		this.scroll.velocity = this.scroll.current - this.scroll.last;

		// Apply friction when user isn’t dragging or scrolling
		if (!this.isDown) {
			this.scroll.target += this.scroll.velocity * 0.2; // inertia (0.9 = friction)
		}

		if (this.scroll.current > this.scroll.last) {
			this.direction = 'down';
		} else if (this.scroll.current < this.scroll.last) {
			this.direction = 'up';
		}

		if (this.medias) {
			this.medias.forEach((media) => media.update(this.scroll, this.direction));
		}

		this.renderer.render(this.scene, this.camera);

		this.scroll.last = this.scroll.current;

		requestAnimationFrame(this.render.bind(this));
	}
}

new Sketch({
	dom: document.getElementById('app'),
});
