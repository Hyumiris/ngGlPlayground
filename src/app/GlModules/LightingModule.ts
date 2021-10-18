import { vec3 } from 'gl-matrix';
import { concatenate } from '../helper/glMatrixHelper';
import { ProgramName } from '../types/GlCore';
import { GlModule } from './GlModule';

declare const lightIDTag: unique symbol;
type LightID = number & { [lightIDTag]: true };
export interface ILight { direction: vec3; color: vec3; }
export interface ILightAlt { from: vec3; to: vec3; color: vec3; }

const MAX_LIGHTS = 4;

export class LightingModule extends GlModule {

	private lightingProgram: ProgramName = 'mainProgram';

	private ambiantLight: vec3 = vec3.fromValues(0, 0, 0);
	private directedLightSources: ILight[] = [];

	public setup() { }

	public nextFrame() {
		this.core.setUniform(this.lightingProgram, 'u_ambient_light', 3, this.ambiantLight);
		this.core.setUniform(
			this.lightingProgram,
			'u_directed_light_direction',
			3,
			concatenate(Float32Array, ...this.directedLightSources.map(s => s.direction))
		);
		this.core.setUniform(
			this.lightingProgram,
			'u_directed_light_color',
			3,
			concatenate(Float32Array, ...this.directedLightSources.map(s => s.color))
		);
	}

	public setAmbientLight(color: vec3) {
		this.ambiantLight = color;
	}

	public createDirectedLightSource(light: ILight | ILightAlt) {
		if (this.directedLightSources.length >= MAX_LIGHTS) { throw new Error('max lights reached'); }
		if ('from' in light) {
			light = { color: light.color, direction: vec3.sub(vec3.create(), light.to, light.from) };
		}
		return this.directedLightSources.push(light) as LightID;
	}

	public deleteDirectedLightSource(id: LightID) {
		this.directedLightSources.splice(id);
	}

	public updateDirectedLightSource(id: LightID, light: ILight | ILightAlt) {
		if (this.directedLightSources.length >= MAX_LIGHTS) { throw new Error('max lights reached'); }
		if ('from' in light) {
			light = { color: light.color, direction: vec3.sub(vec3.create(), light.to, light.from) };
		}
		this.directedLightSources[id] = light;
		return id;
	}

}
