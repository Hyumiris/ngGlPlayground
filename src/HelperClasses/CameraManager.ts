import { mat4, vec3 } from 'gl-matrix';
import { WebGlFacade } from './WebGlFacade';

// TODO: figure out whether direction or center is more comfy

/**
 * manages the 'viewProjection' uniform
 */
export class CameraManager {

	private projection: mat4 = mat4.create();
	private view: mat4 = mat4.create();

	private position: vec3 = vec3.fromValues(0, 0, 0);
	private center: vec3 = vec3.fromValues(0, 0, 0);
	private up: vec3 = vec3.fromValues(0, 1, 0);

	private fovy = 45 * (3.141592 / 180);
	private nearPlane = 0.1;
	private farPlane = 1000;

	constructor(private canvas: HTMLCanvasElement) {}

	public setPosition(position: vec3) {
		this.position = position;
	}

	public setDirection(direction: vec3) {
		vec3.add(this.center, this.position, direction);
	}

	public setCenter(center: vec3) {
		this.center = center;
	}

	private generateViewProjection() {
		this.view = mat4.create();
		mat4.lookAt(this.view, this.position, this.center, this.up);

		this.projection = mat4.create();
		mat4.perspective(this.projection, this.fovy, this.canvas.width / this.canvas.height, this.nearPlane, this.farPlane);
	}

	public nextFrame(gl: WebGlFacade, program: WebGLProgram) {
		this.generateViewProjection();
		gl.setUniformMatrix(program, 'view', 4, Float32Array.from(this.view));
		gl.setUniformMatrix(program, 'projection', 4, Float32Array.from(this.projection));
	}
}
