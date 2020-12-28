import { mat4, vec3 } from 'gl-matrix';
import { GlModule } from './GlModule';

// TODO: figure out whether direction or center is more comfy

/**
 * manages the 'viewProjection' uniform
 */
export class CameraModule extends GlModule {

	private projection: mat4 = mat4.create();
	private view: mat4 = mat4.create();

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

	private generateViewProjection() {
		this.view = mat4.create();
		mat4.lookAt(this.view, this.position, vec3.add(vec3.create(), this.position, this.direction), this.up);

		this.projection = mat4.create();
		mat4.perspective(this.projection, this.fovy, this.core.getCanvasWidth() / this.core.getCanvasHeight(), this.nearPlane, this.farPlane);
	}

	public nextFrame() {
		this.generateViewProjection();
		this.core.setUniformMatrix('mainProgram', 'view', 4, this.view);
		this.core.setUniformMatrix('mainProgram', 'projection', 4, this.projection);
	}
}
