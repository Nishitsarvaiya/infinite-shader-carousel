import { Mesh, ShaderMaterial, TextureLoader, PlaneGeometry, Vector2, LinearFilter, DoubleSide } from 'three';

import fragment from '../shaders/fragment.glsl';
import vertex from '../shaders/vertex.glsl';
import { lerp } from '../utils';

export default class Media {
	constructor({ el, geometry, scene, screen, viewport, width, select, onLoad }) {
		this.element = el;
		this.image = this.element.querySelector('img');

		this.extra = 0;
		this.geometry = geometry || new PlaneGeometry(1, 1, 32, 32);
		this.scene = scene;
		this.screen = screen;
		this.viewport = viewport;
		this.width = width;
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
			-this.viewport.width / 2 +
			this.plane.scale.x / 2 +
			((this.bounds.left - x) / this.screen.width) * this.viewport.width -
			this.extra;
	}

	updateY(y = 0) {
		this.plane.position.y =
			this.viewport.height / 2 - this.plane.scale.y / 2 - ((this.bounds.top - y) / this.screen.height) * this.viewport.height;
	}

	/**
	 * Update per frame
	 */
	update(x, direction) {
		if (!this.plane) return;

		this.updateScale();
		this.updateX(x.current);
		this.updateY();

		const planeOffset = this.plane.scale.x;
		const viewportOffset = this.viewport.width;

		this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
		this.isAfter = this.plane.position.x - planeOffset > viewportOffset;

		// direction names kept same as original OGL (“up” / “down”)
		if (direction === 'down' && this.isBefore) {
			this.extra -= this.width;
			this.isBefore = false;
			this.isAfter = false;
		}

		if (direction === 'up' && this.isAfter) {
			this.extra += this.width;
			this.isBefore = false;
			this.isAfter = false;
		}

		// bend strength from scroll delta
		const strengthFactor = window.innerWidth > 1024 ? 20 : 5;
		const rawStrength = ((x.current - x.last) / this.screen.width) * strengthFactor;
		const easedStrength = Math.sign(rawStrength) * Math.pow(Math.abs(rawStrength), 0.8);
		this.plane.material.uniforms.uStrength.value = lerp(this.plane.material.uniforms.uStrength.value, easedStrength, 0.1);
	}

	/**
	 * Calculate the scroll position needed to center this plane at viewport center (x = 0)
	 */
	getSnapScrollPosition() {
		if (!this.plane) return null;

		// Recalculate bounds to get current DOM position
		const bounds = this.element.getBoundingClientRect();

		// We want plane.position.x = 0
		// From updateX: plane.position.x = -viewport.width/2 + plane.scale.x/2 + ((bounds.left - scroll) / screen.width) * viewport.width - extra
		// Solving for scroll when plane.position.x = 0:
		// 0 = -viewport.width/2 + plane.scale.x/2 + ((bounds.left - scroll) / screen.width) * viewport.width - extra
		// scroll = bounds.left - (viewport.width/2 - plane.scale.x/2 + extra) * screen.width / viewport.width

		const scrollPosition =
			bounds.left - ((this.viewport.width / 2 - this.plane.scale.x / 2 + this.extra) * this.screen.width) / this.viewport.width;

		return scrollPosition;
	}

	/**
	 * Get the distance from this plane's center to the viewport center
	 */
	getDistanceToCenter() {
		if (!this.plane) return Infinity;
		return Math.abs(this.plane.position.x);
	}

	/**
	 * Resize handler
	 */
	onResize(sizes) {
		this.extra = 0;

		if (sizes) {
			const { width, screen, viewport } = sizes;

			if (width) this.width = width;
			if (screen) this.screen = screen;
			if (viewport) {
				this.viewport = viewport;
				this.plane.material.uniforms.uViewportSizes.value.set(this.viewport.width, this.viewport.height);
			}
		}

		this.createBounds();
	}
}
