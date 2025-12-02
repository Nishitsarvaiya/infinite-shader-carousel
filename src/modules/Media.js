import { Mesh, ShaderMaterial, TextureLoader, PlaneGeometry, Vector2, LinearFilter, DoubleSide } from 'three';

import fragment from '../shaders/fragment.glsl';
import vertex from '../shaders/vertex.glsl';
import { lerp } from '../utils';

export default class Media {
	constructor({ el, geometry, scene, screen, viewport, height, select, onLoad }) {
		this.element = el;
		this.image = this.element.querySelector('img');

		this.extra = 0;
		this.geometry = geometry || new PlaneGeometry(1, 1, 32, 32);
		this.scene = scene;
		this.screen = screen;
		this.viewport = viewport;
		this.height = height;
		this.select = select;
		this.onLoad = onLoad;

		this.createMesh();
	}

	/**
	 * Create Mesh
	 */
	createMesh() {
		const loader = new TextureLoader();

		loader.load(this.image.src, (texture) => {
			texture.needsUpdate = true;
			texture.minFilter = LinearFilter;
			texture.magFilter = LinearFilter;
			texture.generateMipmaps = false;

			this.material = new ShaderMaterial({
				vertexShader: vertex,
				fragmentShader: fragment,
				uniforms: {
					tMap: { value: texture },
					uPlaneSizes: { value: new Vector2(0, 0) },
					uImageSizes: {
						value: new Vector2(this.image.naturalWidth, this.image.naturalHeight),
					},
					uViewportSizes: {
						value: new Vector2(this.viewport.width, this.viewport.height),
					},
					uStrength: { value: 0 },
					uMode: { value: this.select.value },
					vFoldLight: { value: 1.0 },
				},
				transparent: true,
				side: DoubleSide,
			});
			this.material.depthTest = false;
			this.material.depthWrite = false;

			this.plane = new Mesh(this.geometry, this.material);
			this.scene.add(this.plane);

			this.createBounds();
			this.onResize();

			// Notify that this plane has loaded
			if (this.onLoad) {
				this.onLoad();
			}
		});
	}

	/**
	 * Compute DOM bounds and set scale/position
	 */
	createBounds() {
		if (!this.plane) return;

		this.bounds = this.element.getBoundingClientRect();

		this.updateScale();
		this.updateX();
		this.updateY();

		this.plane.material.uniforms.uPlaneSizes.value.set(this.plane.scale.x, this.plane.scale.y);
	}

	updateScale() {
		this.plane.scale.x = (this.viewport.width * this.bounds.width) / this.screen.width;
		this.plane.scale.y = (this.viewport.height * this.bounds.height) / this.screen.height;
	}

	updateX(x = 0) {
		// note: minus this.extra because OGL moves extra opposite the scroll
		this.plane.position.x =
			-this.viewport.width / 2 + this.plane.scale.x / 2 + ((this.bounds.left - x) / this.screen.width) * this.viewport.width;
	}

	updateY(y = 0) {
		this.plane.position.y =
			this.viewport.height / 2 -
			this.plane.scale.y / 2 -
			((this.bounds.top - y) / this.screen.height) * this.viewport.height -
			this.extra;
	}

	/**
	 * Update per frame
	 */
	update(y, direction) {
		if (!this.plane) return;

		this.updateScale();
		// this.updateX(x.current);
		this.updateY(y.current);

		// Plane center is at position.y, so edges are at position.y ± scale.y/2
		// Viewport center is at y=0, so edges are at ±viewport.height/2
		const planeHalfHeight = this.plane.scale.y / 2;
		const viewportHalfHeight = this.viewport.height / 2;

		// Check if plane is COMPLETELY outside viewport before wrapping
		// isBefore: plane's TOP edge is below viewport bottom (plane completely below)
		// isAfter: plane's BOTTOM edge is above viewport top (plane completely above)
		this.isBefore = this.plane.position.y + planeHalfHeight < -viewportHalfHeight;
		this.isAfter = this.plane.position.y - planeHalfHeight > viewportHalfHeight;

		// When scrolling down, planes move up. If plane goes off top (isAfter), wrap to bottom.
		// When scrolling up, planes move down. If plane goes off bottom (isBefore), wrap to top.
		if (direction === 'down' && this.isAfter) {
			// Plane went off top, wrap to bottom by moving it down
			this.extra += this.height;
			this.isBefore = false;
			this.isAfter = false;
		}

		if (direction === 'up' && this.isBefore) {
			// Plane went off bottom, wrap to top by moving it up
			this.extra -= this.height;
			this.isBefore = false;
			this.isAfter = false;
		}

		// bend strength from scroll delta
		const strengthFactor = window.innerWidth > 1024 ? 20 : 5;
		const rawStrength = ((y.current - y.last) / this.screen.height) * strengthFactor;
		const easedStrength = Math.sign(rawStrength) * Math.pow(Math.abs(rawStrength), 0.8);
		this.plane.material.uniforms.uStrength.value = lerp(this.plane.material.uniforms.uStrength.value, easedStrength, 0.1);
	}

	/**
	 * Calculate the scroll position needed to center this plane at viewport center (y = 0)
	 */
	getSnapScrollPosition() {
		if (!this.plane) return null;

		// Recalculate bounds to get current DOM position
		const bounds = this.element.getBoundingClientRect();

		// We want plane.position.y = 0
		// From updateY: plane.position.y = viewport.height/2 - plane.scale.y/2 - ((bounds.top - scroll) / screen.height) * viewport.height - extra
		// Solving for scroll when plane.position.y = 0:
		// 0 = viewport.height/2 - plane.scale.y/2 - ((bounds.top - scroll) / screen.height) * viewport.height - extra
		// 0 = viewport.height/2 - plane.scale.y/2 - (bounds.top - scroll) * viewport.height / screen.height - extra
		// (bounds.top - scroll) * viewport.height / screen.height = viewport.height/2 - plane.scale.y/2 - extra
		// bounds.top - scroll = (viewport.height/2 - plane.scale.y/2 - extra) * screen.height / viewport.height
		// scroll = bounds.top - (viewport.height/2 - plane.scale.y/2 - extra) * screen.height / viewport.height

		const scrollPosition =
			bounds.top - ((this.viewport.height / 2 - this.plane.scale.y / 2 - this.extra) * this.screen.height) / this.viewport.height;

		return scrollPosition;
	}

	/**
	 * Get the distance from this plane's center to the viewport center
	 */
	getDistanceToCenter() {
		if (!this.plane) return Infinity;
		return Math.abs(this.plane.position.y);
	}

	/**
	 * Resize handler
	 */
	onResize(sizes) {
		this.extra = 0;

		if (sizes) {
			const { height, screen, viewport } = sizes;

			if (height) this.height = height;
			if (screen) this.screen = screen;
			if (viewport) {
				this.viewport = viewport;
				this.plane.material.uniforms.uViewportSizes.value.set(this.viewport.width, this.viewport.height);
			}
		}

		this.createBounds();
	}
}
