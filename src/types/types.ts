import { mat4, vec2, vec3 } from 'gl-matrix';

export type TypedArray = Int8Array | Int16Array | Int32Array
	| Uint8ClampedArray | Uint8Array | Uint16Array | Uint32Array
	| Float32Array | Float64Array;


export const SIZE_FLOAT = 4;
export const SIZE_VERTEX_DATA = 6 * SIZE_FLOAT;

export interface IModelData {
	position: vec3[];
	normal: vec3[];
	texCoords?: vec2[];
	X: { min: number, max: number };
	Y: { min: number, max: number };
	Z: { min: number, max: number };
}

/** how many floats form one mat4 */
export const MAT4LENGTH = mat4.create().length;

export type ModelID = number;
export type InstanceID = number;
