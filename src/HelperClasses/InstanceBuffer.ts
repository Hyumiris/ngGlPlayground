import { mat4, vec2, vec3 } from 'gl-matrix';
import { concatenate } from '../helper/glMatrixHelper';
import { IModelDataBase } from '../ModelLoader/ModelLoader.types';
import { ModelInstance } from './ModelManager';
import { WebGlFacade } from './WebGlFacade';

/** manages an fixed length array of instances */
class InstanceArray {
	/** the array containing the instances */
	private data = new Array<ModelInstance | null>(this.maxInstances).fill(null);
	/** for every position it stores the position that should be written to afterwards */
	private freeDataSuccessorList = new Array<number>(this.maxInstances).fill(0).map((_, i) => (i + 1 !== this.maxInstances) ? i + 1 : -1);
	/** the first free position that should be written to */
	private firstFreePos = 0;
	/** the last position, that is writable */
	private lastFreePos = this.maxInstances - 1;
	/** a default value for unset instances */
	private readonly defaultMatrix = mat4.create();

	/**
	 * @param maxInstances maximum number of stored instances
	 */
	constructor(
		private readonly maxInstances: number
	) { }

	public getModelMatrices() {
		return this.data.map(i => i ? i.model : this.defaultMatrix);
	}

	public getNormalMatrices() {
		return this.data.map(i => i ? i.normal : this.defaultMatrix);
	}

	/**
	 * Adds the instance to a free postion. Will fail if all positions are already filled.
	 * @param matrix the instance to be stored
	 * @returns position of the instance
	 */
	public addInstance(instance: ModelInstance): number {
		if (this.firstFreePos < 0) { throw new Error('matrices at maximum capacity'); }
		if (this.firstFreePos === this.lastFreePos) { this.lastFreePos = -1; }
		const position = this.firstFreePos;
		this.firstFreePos = this.freeDataSuccessorList[this.firstFreePos];
		this.data[position] = instance;
		return position;
	}

	/**
	 * Removes the instance at the given position.
	 * @param position the index of the instance to clear
	 */
	public removeInstance(instance: ModelInstance) {
		const position = this.data.indexOf(instance);
		this.data[position] = null;

		this.freeDataSuccessorList[position] = -1;
		if (this.lastFreePos < 0) {
			this.firstFreePos = position;
		} else {
			this.freeDataSuccessorList[this.lastFreePos] = position;
		}
		this.lastFreePos = position;
	}
}

export class InstanceDataBuffer {

	public static readonly SIZE_FLOAT = 4;
	// tslint:disable-next-line: max-line-length
	public static readonly VERTEXDATALENGTH = InstanceDataBuffer.SIZE_FLOAT * concatenate(Float32Array, new Float32Array(3), new Float32Array(3), new Float32Array(2), new Float32Array(1)).length;

	public numVertices = 0;
	private instanceArray = new InstanceArray(100);
	private instances = new Map<ModelInstance, Float32Array>();
	private vertexData = new Float32Array();
	private vertexDataChanged = true;

	public addInstance(instance: ModelInstance, model: IModelDataBase) {
		// update overall vertex count
		this.numVertices += model.position.length;

		// add model matrix for this instance
		const instancePos = Float32Array.from([this.instanceArray.addInstance(instance)]);

		// add attribute data
		const indices = [...Array(model.position.length).keys()];
		const layoutedVertexDataArr = indices.map(i => concatenate(
			Float32Array, Float32Array.from(model.position[i]), Float32Array.from(model.normal[i]), Float32Array.from(model.texCoords[i]), instancePos));
		const layoutedVertexData = concatenate(Float32Array, layoutedVertexDataArr);
		this.vertexData = concatenate(Float32Array, layoutedVertexData, this.vertexData);

		// store the high level instance information
		this.instances.set(instance, layoutedVertexData);

		// set changed flag
		this.vertexDataChanged = true;
	}

	public removeInstance(instance: ModelInstance) {
		this.instanceArray.removeInstance(instance);
		this.instances.delete(instance);
		this.recalculateBufferData();
	}

	public getMatrices() {
		const modelMatrices = this.instanceArray.getModelMatrices();
		const normalMatrices = this.instanceArray.getNormalMatrices();
		return { modelMatrices, normalMatrices };
	}

	public updateAttributeBuffer(gl: WebGlFacade, buffer: WebGLBuffer | null, forced = false) {
		if (!(this.vertexDataChanged || forced)) { return; }
		gl.bindBuffer(buffer);
		gl.setBufferDataStaticDraw(this.vertexData);
		this.vertexDataChanged = false;
	}

	private recalculateBufferData() {
		const instanceData = [...this.instances.values()];
		this.vertexData = concatenate(Float32Array, instanceData);
		this.vertexDataChanged = true;
	}

}
