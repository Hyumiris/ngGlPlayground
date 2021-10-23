import { vec2, vec3 } from 'gl-matrix';

export interface IModelData {
	position: vec3[];
	normal: vec3[];
	texCoords: vec2[];
	X: { min: number, max: number };
	Y: { min: number, max: number };
	Z: { min: number, max: number };
}

export interface IFace {
	/** 0-indices for v */
	position: number[];
	/** 0-indices for vt */
	texCoords: number[];
	/** 0-indices for vn */
	normal: number[];
	/** name of the material associated with this face */
	material: string;
}

export interface IObjModel {
	v: vec3[];
	vn: vec3[];
	vt: vec2[];
	faces: IFace[];
	materials: IMaterialGroup;
}

export interface IMaterial {
	ambient: vec3;
	diffuse: vec3;
	specular: vec3;
	/** 0 - 1000 */
	specular_exp: number;
	color_map?: string;
	bump_map?: string;
}

export interface IMaterialGroup {
	[name: string]: IMaterial;
}
