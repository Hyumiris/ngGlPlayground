import { vec2, vec3 } from 'gl-matrix';

export interface IModelData {
	position: vec3[];
	normal: vec3[];
	texCoords: vec2[];
	X: { min: number, max: number };
	Y: { min: number, max: number };
	Z: { min: number, max: number };
}
