import { vec3 } from 'gl-matrix';
import { concatenate } from '../helper/glMatrixHelper';
import { ProgramName } from '../types/GlCore';
import { GlModule } from './GlModule';

export class LightingModule extends GlModule {

	private lightingProgram: ProgramName = 'mainProgram';

	private ambiantLight!: vec3;
	private lightSources!: { direction: vec3; light: vec3 }[];

	private lightSourcesAsUniform() {
		return this.lightSources.reduce((acc, val) => concatenate(Float32Array, acc, val.direction, val.light), new Float32Array());
	}

	public setup() {
		this.ambiantLight = vec3.fromValues(0.2, 0.2, 0.6);
		this.lightSources = new Array(4).fill(null).map(() => ({ direction: vec3.fromValues(0, 0, 0), light: vec3.fromValues(0.0, 0.0, 0.0) }));
		this.lightSources[0] = { direction: vec3.fromValues(0.0, -1.0, -0.3), light: vec3.fromValues(0.3, 0.3, 0.3) };
		this.lightSources[1] = { direction: vec3.fromValues(0.0, -0.7, 0.7), light: vec3.fromValues(0.9, 0.1, 0.0) };
		this.lightSources[2] = { direction: vec3.fromValues(0.3, -0.7, -0.8), light: vec3.fromValues(0.0, 0.1, 0.8) };
	}

	public nextFrame() {
		this.core.setUniform(this.lightingProgram, 'u_ambient_light', 3, this.ambiantLight);
		this.core.setUniform(this.lightingProgram, 'u_diffuse_light', 3, this.lightSourcesAsUniform());
	}

}
