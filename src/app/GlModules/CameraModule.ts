import { mat4, vec3 } from 'gl-matrix';
import { GlModule } from './GlModule';

// TODO: figure out whether direction or center is more comfy

/**
 * manages the 'viewProjection' uniform
 */
export class CameraModule extends GlModule {

	private viewProjection: mat4 = mat4.create();

	private position: vec3 = vec3.fromValues(0, 0, 0);
	private direction: vec3 = vec3.fromValues(1, 0, 0);
	private up: vec3 = vec3.fromValues(0, 1, 0);

	private fovy = 45 * (3.141592 / 180);
	private nearPlane = 0.1;
	private farPlane = 800;

	public setPosition(position: vec3) {
		this.position = position;
	}

	public setDirection(direction: vec3) {
		this.direction = direction;
	}

	private generateViewProjectionMatrix() {
		const view = mat4.create();
		mat4.lookAt(view, this.position, vec3.add(vec3.create(), this.position, this.direction), this.up);

		const projection = mat4.create();
		mat4.perspective(projection, this.fovy, this.core.getCanvasWidth() / this.core.getCanvasHeight(), this.nearPlane, this.farPlane);

		mat4.multiply(this.viewProjection, projection, view);
	}

	public nextFrame() {
		this.generateViewProjectionMatrix();
		this.core.setUniformMatrix('mainProgram', 'viewProjection', 4, this.viewProjection);
	}
}
