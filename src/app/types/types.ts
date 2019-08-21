import { vec3 } from 'gl-matrix';

export type TypedArray = Int8Array | Int16Array | Int32Array
	| Uint8ClampedArray | Uint8Array | Uint16Array | Uint32Array
	| Float32Array | Float64Array;


export const SIZE_FLOAT = 4;
export const SIZE_VERTEX_DATA = 6;
export interface IVertexData {
	position: vec3;
	/** normalized normal vector */
	normal: vec3;
}
