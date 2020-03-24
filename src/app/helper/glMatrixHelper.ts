import { TypedArray } from '../types/types';
import { vec4, mat4, vec3 } from 'gl-matrix';

export function concatenate<T extends TypedArray>(type: (new (length: number) => T), first?: Array<T> | T, ...rest: Array<T>) {
	if (!first) { return new type(0); }
	const firstLength = (first instanceof Array) ? first.reduce((total, arr) => total + arr.length, 0) : first.length;
	const restLength = rest.reduce((total, arr) => total + arr.length, 0);
	const totalLength = firstLength + restLength;
	const result = new type(totalLength);

	if (first instanceof Array) {
		first.reduce((offset, arr) => {
			result.set(arr, offset);
			return offset + arr.length;
		}, 0);
	} else {
		result.set(first, 0);
	}
	rest.reduce((offset, arr) => {
		result.set(arr, offset);
		return offset + arr.length;
	}, firstLength);
	return result;
}

/**
 * @param out the resulting point
 * @param point the coordinates of the point that should be rotated
 * @param axis The direction of the axis to rotate around. It is assumed to go through the coordinate origin.
 * @param angle how far the point should be rotated around the axis
 *
 * Rotates a point around an axis.
 */
export function rotate(out: vec3, point: vec3, axis: vec3, angle: number): vec3 {
	const result = vec4.fromValues(point[0], point[1], point[2], 1.0);
	const rotationMatrix = mat4.create();
	mat4.rotate(rotationMatrix, rotationMatrix, angle, axis);
	vec4.transformMat4(result, result, rotationMatrix);
	out[0] = result[0];
	out[1] = result[1];
	out[2] = result[2];
	return out;
}

export function createCuboid(minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number) {
	const _xyz = vec3.fromValues(minX, minY, minZ);
	const _xyZ = vec3.fromValues(minX, minY, maxZ);
	const _xYz = vec3.fromValues(minX, maxY, minZ);
	const _xYZ = vec3.fromValues(minX, maxY, maxZ);
	const _Xyz = vec3.fromValues(maxX, minY, minZ);
	const _XyZ = vec3.fromValues(maxX, minY, maxZ);
	const _XYz = vec3.fromValues(maxX, maxY, minZ);
	const _XYZ = vec3.fromValues(maxX, maxY, maxZ);

	// x:-, y:|, z:•
	return concatenate(Float32Array,
		_xyz, _xyZ, _XyZ, _XyZ, _Xyz, _xyz, // bottom
		_xYz, _xYZ, _XYZ, _XYZ, _XYz, _xYz, // top
		_xYz, _xyz, _xyZ, _xyZ, _xYZ, _xYz, // left
		_XYz, _Xyz, _XyZ, _XyZ, _XYZ, _XYz, // right
		_xYz, _xyz, _Xyz, _Xyz, _XYz, _xYz, // back
		_xYZ, _xyZ, _XyZ, _XyZ, _XYZ, _xYZ, // front
	);
}
