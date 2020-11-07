import { mat4 } from 'gl-matrix';
import { MAT4LENGTH } from '../types/types';

/** manages an array of instance matrices */
export class InstanceMatrixArray {
	/** the array containng the matrices */
	private data: Float32Array = new Float32Array(MAT4LENGTH * this.maxInstances);
	/** for every position it stores the position that should be written to afterwards */
	private freeDataSuccessorList = new Array<number>(this.maxInstances).fill(0).map((_, i) => (i + 1 !== this.maxInstances) ? i + 1 : -1);
	/** the first free position that should be written to */
	private firstFreePos = 0;
	/** the last position, that is writable */
	private lastFreePos = this.maxInstances - 1;

	/**
	 * @param maxInstances maximum number of stored matrices
	 */
	constructor(
		private readonly maxInstances: number
	) { }

	public getData() {
		return this.data;
	}

	/**
	 * Returns the matrix at the requested position. If a free position is requested the behaviour is undefined.
	 * @param position the index of the requested matrix
	 * @returns the matrix at position
	 */
	public getInstanceMatrix(position: number) {
		return mat4.fromValues.apply(mat4, this.data.subarray(MAT4LENGTH * position, MAT4LENGTH * (position + 1)));
	}

	/**
	 * overwrites matrix at the given position.
	 * @param position target position in array
	 * @param matrix the new matrix at the given position
	 */
	public setInstanceMatrix(position: number, matrix: mat4) {
		matrix.forEach((val, idx) => this.data[MAT4LENGTH * position + idx] = val);
	}

	/**
	 * Adds the matrix to a free postion. Will fail if all positions are already filled.
	 * @param matrix the matrix to be stored
	 * @returns position of the matrix
	 */
	public addInstanceMatrix(matrix: mat4): number {
		if (this.firstFreePos < 0) { throw new Error('matrices at maximum capacity'); }
		if (this.firstFreePos === this.lastFreePos) { this.lastFreePos = -1; }
		const position = this.firstFreePos;
		this.firstFreePos = this.freeDataSuccessorList[this.firstFreePos];
		this.setInstanceMatrix(position, matrix);
		return position;
	}

	/**
	 * Removes the matrix at the given position. Optionally zeroes this position as well.
	 * @param position the index of the matrix to clear
	 * @param clearBits whether the memory should be zeroed
	 */
	public removeInstanceMatrix(position: number, clearBits = false) {
		if (clearBits) {
			this.setInstanceMatrix(position, mat4.fromValues(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
		}

		this.freeDataSuccessorList[position] = -1;
		if (this.lastFreePos < 0) {
			this.firstFreePos = position;
			this.lastFreePos = position;
		} else {
			this.freeDataSuccessorList[this.lastFreePos] = position;
		}
	}
}
