import { mat4 } from 'gl-matrix';

/** manages an array of instance matrices */
export class InstanceMatrixArray {
	/** the array containng the matrices */
	private data = new Array<mat4>(this.maxInstances).fill(mat4.create());
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

	public getModelMatrices() {
		return this.data;
	}

	public getModelViewMatrices(view: mat4) {
		return this.data.map(model => mat4.multiply(mat4.create(), view, model));
	}

	/**
	 * Returns the matrix at the requested position. If a free position is requested the behaviour is undefined.
	 * @param position the index of the requested matrix
	 * @returns the matrix at position
	 */
	public getInstanceMatrix(position: number) {
		return this.data[position];
	}

	/**
	 * overwrites matrix at the given position.
	 * @param position target position in array
	 * @param matrix the new matrix at the given position
	 */
	public setInstanceMatrix(position: number, matrix: mat4) {
		this.data[position] = matrix;
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
		} else {
			this.freeDataSuccessorList[this.lastFreePos] = position;
		}
		this.lastFreePos = position;
	}
}
