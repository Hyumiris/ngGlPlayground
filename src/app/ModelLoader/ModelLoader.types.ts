import { vec2, vec3 } from 'gl-matrix';

export interface IModelData {
	position: vec3[];
	normal: vec3[];
	texCoords: vec2[];
	X: { min: number, max: number };
	Y: { min: number, max: number };
	Z: { min: number, max: number };
}

export interface IMaterial {
	ambient: vec3;
	diffuse: vec3;
	specular: vec3;
	specular_exp: number;
	color_map?: string;
	bump_map?: string;
}

export interface IMaterialGroup {
	[name: string]: IMaterial;
}
