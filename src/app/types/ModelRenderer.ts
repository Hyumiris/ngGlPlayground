import { mat4, vec3 } from 'gl-matrix';
import { ModelID, InstanceID, ModelData, SIZE_FLOAT } from './types';
import { GlModule } from './GlModule';
import { ProgramName } from './GlCore';
import { concatenate } from '../helper/glMatrixHelper';

/*
Data Layout:

vec3 - position
vec3 - normal
float - instanceIndex
*/

const MAT4LENGTH = mat4.create().length;
const VERTEXDATALENGTH = concatenate(Float32Array, vec3.create(), vec3.create(), new Float32Array(1)).length;

interface IModelInstance {
	modelID: ModelID;
}

class InstanceMatrixArray {
	private data: Float32Array = new Float32Array(MAT4LENGTH * this.maxInstances);
	/** for every position it stores the position that should be written to afterwards */
	private freeDataSuccessorList: number[] = new Array<number>(this.maxInstances).map((_, i) => (i + 1 !== this.maxInstances) ? i + 1 : -1);
	/** the first free position that should be written to */
	private firstFreePos = 0;
	/** the last position, that is writable */
	private lastFreePos = this.maxInstances - 1;

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

class VertexDataArray {
	private vertexDataChanged = false;
	private vertexData = new Float32Array();
	private numVertices = 0;

	public getData(resetChangedFlag = true) {
		const retVal = {
			data: this.vertexData,
			changed: this.vertexDataChanged,
			numVertices: this.numVertices
		};
		if (resetChangedFlag) { this.vertexDataChanged = false; }
		return retVal;
	}

	public addVertexData(modelData: ModelData, instanceIndex: number) {
		this.numVertices += modelData.length;
		const layoutedVertexData = modelData.map(vd => concatenate(Float32Array, vd.position, vd.normal, Float32Array.from([instanceIndex])));
		this.vertexData = concatenate(Float32Array, layoutedVertexData, this.vertexData);
		this.vertexDataChanged = true;
	}
}

class GlModelRendererModule extends GlModule {
	private models: ModelData[] = [];
	private instances: ModelID[] = [];
	private instanceMatrices = new InstanceMatrixArray(100);
	private vertexData = new VertexDataArray();
	private modelRendererProgram!: ProgramName;


	constructor(private clearColor?: vec3) { super(); }

	public setClearColor(clearColor?: vec3) {
		this.clearColor = clearColor;
	}

	/**
	 * overwrites the default rendering program
	 *
	 * The following attributes should be present in th program:
	 * - modelMatrices (mat4[100])
	 * @param renderingProgram the program to be used by this renderer
	 */
	public setRenderingProgram(renderingProgram: ProgramName) {
		this.modelRendererProgram = renderingProgram;
	}

	public createModel(modelData: ModelData): ModelID {
		return this.models.push(modelData) - 1;
	}

	public destroyModel(model: ModelID) {
		Object.keys(this.instances).map(k => parseInt(k, 10)).filter(k => this.instances[k] === model).forEach(k => this.destroyInstance(k));
		delete this.models[model];
	}

	public createInstance(model: ModelID, instanceMatrix?: mat4): InstanceID {
		if (!(model in this.models)) { throw new Error('model doesn\'t exist'); }
		instanceMatrix = instanceMatrix || mat4.create();
		const instanceId = this.instanceMatrices.addInstanceMatrix(instanceMatrix);
		this.vertexData.addVertexData(this.models[model], instanceId);
		this.instances[instanceId] = model;
		return instanceId;
	}

	public destroyInstance(instance: InstanceID) {
		this.instanceMatrices.removeInstanceMatrix(instance);
		// TODO: remove instance vertices
		delete this.instances[instance];
	}

	public setMatrix(instance: InstanceID, mat: mat4) {
		this.instanceMatrices.setInstanceMatrix(instance, mat);
	}

	/**
	 * Performs matrix multiplication: transform * instanceMatrix.
	 * Stores the result as the new instance matrix.
	 * @param instance the instance for which the matrix should be transformed
	 * @param transform the transformation matrix
	 */
	public transformMatrix(instance: InstanceID, transform: mat4) {
		const instanceMatrix = this.instanceMatrices.getInstanceMatrix(instance);
		mat4.multiply(instanceMatrix, transform, instanceMatrix);
		this.instanceMatrices.setInstanceMatrix(instance, instanceMatrix);
	}

	// ===== GlModule hooks

	protected setup() {
		if (!this.modelRendererProgram) {
			this.core.createShader('modelRendererVertexShader', WebGLRenderingContext.VERTEX_SHADER, '');
			this.core.createShader('modelRendererFragmentShader', WebGLRenderingContext.FRAGMENT_SHADER, '');
			this.core.createProgram('modelRendererProgram', 'modelRendererVertexShader', 'modelRendererFragmentShader');
			this.modelRendererProgram = 'modelRendererProgram';
		}
	}

	public nextFrame() {
		this.core.useProgram(this.modelRendererProgram);
		this.core.enable(WebGLRenderingContext.DEPTH_TEST);

		if (this.clearColor) { this.core.clearViewport(this.clearColor); }

		const vertexDataObj = this.vertexData.getData();
		if (vertexDataObj.changed) {
			this.core.setBufferDataStaticDraw(vertexDataObj.data);
		}

		this.core.setVertexAttribPointer(this.modelRendererProgram, 'position', 3, WebGLRenderingContext.FLOAT, false, VERTEXDATALENGTH, 0);
		this.core.setVertexAttribPointer(this.modelRendererProgram, 'normal', 3, WebGLRenderingContext.FLOAT, false, VERTEXDATALENGTH, 3 * SIZE_FLOAT);
		this.core.setVertexAttribPointer(this.modelRendererProgram, 'instanceIndex', 1, WebGLRenderingContext.FLOAT, false, VERTEXDATALENGTH, 6 * SIZE_FLOAT);

		this.core.setUniformMatrix(this.modelRendererProgram, 'modelMatrices', 4, this.instanceMatrices.getData());

		this.core.drawArrays(WebGLRenderingContext.TRIANGLES, 0, vertexDataObj.numVertices);
	}
}

export {
	// classes
	GlModelRendererModule as ModelRenderer
};
