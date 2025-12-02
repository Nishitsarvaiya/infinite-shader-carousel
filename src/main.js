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
			velocity: 0,
		};
		this.snapThreshold = 1.0; // velocity threshold to trigger snap (pixels per frame) - higher = earlier snap
		this.isSnapping = false;
		this.snapTarget = null; // store the snap target once, don't recalculate
		this.wasScrolling = false; // track if we were scrolling in previous frame
		this.lastVelocity = 0; // track previous velocity to detect deceleration
		this.planesLoaded = 0; // track how many planes have loaded
		this.initialSnapDone = false; // track if initial snap has been done
		this.framesAfterLoad = 0; // count frames after all planes loaded

		this.isPlaying = true;
		this.select = document.getElementById('shaderMode');

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
		const isDesktop = window.innerWidth > 1200;
		const isTablet = window.innerWidth > 768;

		let segments;

		if (isDesktop) segments = 256;
		else if (isTablet) segments = 128;
		else segments = 48;

		this.planeGeometry = new PlaneGeometry(1, 1, segments, segments);
	}

	createMedias() {
		this.mediaEls = document.querySelectorAll('.carousel__figure');
		this.planesLoaded = 0;
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
					select: this.select,
					onLoad: () => {
						this.planesLoaded++;
					},
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

		// Load saved mode
		const savedMode = localStorage.getItem('shaderMode');
		if (savedMode) this.select.value = savedMode;

		this.select.addEventListener('change', (e) => {
			const mode = e.target.value;
			localStorage.setItem('shaderMode', mode);
			this.medias.forEach((media) => {
				media.plane.material.uniforms.uMode.value = Number(mode);
			});
		});
	}

	onWheel(e) {
		const normalized = normalizeWheel(e);
		const speed = normalized.pixelY;

		this.scroll.target += speed * 0.8;
		this.isSnapping = false; // cancel any ongoing snap
		this.snapTarget = null; // clear snap target
		this.wasScrolling = true; // mark that we're scrolling
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
		this.isSnapping = false; // cancel any ongoing snap
		this.snapTarget = null; // clear snap target
		this.wasScrolling = true; // mark that we're scrolling
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

		this.createGeometry(); // rebuild geometry based on new screen size
		if (this.medias) {
			this.medias.forEach((media) => {
				media.plane.geometry.dispose();
				media.plane.geometry = this.planeGeometry;
				media.onResize({
					width: this.galleryWidth,
					screen: this.screen,
					viewport: this.viewport,
				});
			});
		}
	}

	snapToNearestPlane() {
		if (!this.medias || this.medias.length === 0) return;

		// If we already have a snap target, use it (don't recalculate)
		if (this.snapTarget !== null) {
			this.scroll.target = this.snapTarget;
			this.isSnapping = true;
			return;
		}

		// Find the plane closest to the viewport center
		let nearestMedia = null;
		let minDistance = Infinity;

		this.medias.forEach((media) => {
			if (!media.plane) return;
			const distance = media.getDistanceToCenter();
			if (distance < minDistance) {
				minDistance = distance;
				nearestMedia = media;
			}
		});

		if (nearestMedia) {
			const snapPosition = nearestMedia.getSnapScrollPosition();
			if (snapPosition !== null) {
				this.snapTarget = snapPosition; // store it once
				this.scroll.target = lerp(snapPosition, this.scroll.target, 0.08);
				this.isSnapping = true;
			}
		}
	}

	render() {
		if (!this.isPlaying) return;
		this.time += 0.05;

		this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);

		// Compute velocity
		this.scroll.velocity = this.scroll.current - this.scroll.last;

		// Detect deceleration (velocity decreasing significantly)
		const isDecelerating =
			Math.abs(this.scroll.velocity) < Math.abs(this.lastVelocity) * 0.7 && Math.abs(this.lastVelocity) > this.snapThreshold;

		// Detect if scrolling has stopped (transition from scrolling to stopped)
		// Trigger earlier when velocity drops below threshold OR when decelerating significantly
		const isScrolling = Math.abs(this.scroll.velocity) > this.snapThreshold;
		const justStopped = this.wasScrolling && (!isScrolling || isDecelerating) && !this.isDown;

		// Apply friction when user isn't dragging or scrolling, but NOT when snapping
		if (!this.isDown && !this.isSnapping) {
			this.scroll.target += this.scroll.velocity * 0.001; // inertia
		}

		if (this.scroll.current > this.scroll.last) {
			this.direction = 'down';
		} else if (this.scroll.current < this.scroll.last) {
			this.direction = 'up';
		}

		// Update planes first to get their current positions
		if (this.medias) {
			this.medias.forEach((media) => media.update(this.scroll, this.direction));
		}

		// Initial snap after all planes are loaded (wait a few frames for positioning)
		if (!this.initialSnapDone && this.planesLoaded === this.medias.length && this.medias.every((media) => media.plane)) {
			this.framesAfterLoad++;
			// Wait 3 frames for planes to be positioned correctly
			if (this.framesAfterLoad >= 3) {
				this.snapToNearestPlane();
				this.initialSnapDone = true;
			}
		}

		// Snap to nearest plane when scrolling just stopped
		if (justStopped && !this.isSnapping) {
			this.snapToNearestPlane();
		}

		// Reset snapping flag and snap target when we've reached the target
		if (this.isSnapping && Math.abs(this.scroll.current - this.scroll.target) < 0.1) {
			this.isSnapping = false;
			this.snapTarget = null; // clear snap target once we've reached it
		}

		// Update wasScrolling for next frame
		this.wasScrolling = isScrolling;

		this.renderer.render(this.scene, this.camera);

		this.scroll.last = this.scroll.current;

		requestAnimationFrame(this.render.bind(this));
	}
}

new Sketch({
	dom: document.getElementById('app'),
});
