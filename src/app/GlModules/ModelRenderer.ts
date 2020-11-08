import { mat4, vec3 } from 'gl-matrix';
import { ModelID, InstanceID, ModelData, SIZE_FLOAT } from '../types/types';
import { GlModule } from './GlModule';
import { ProgramName } from '../types/GlCore';
import { concatenate } from '../helper/glMatrixHelper';
import { InstanceMatrixArray } from '../HelperClasses/InstanceMatrixArray';
import { VertexDataArray } from '../HelperClasses/VertexDataArray';

/*
Data Layout:

vec3 - position
vec3 - normal
float - instanceIndex
*/

/** how many byte encompasses the data for one vertex */
const VERTEXDATALENGTH = SIZE_FLOAT * concatenate(Float32Array, vec3.create(), vec3.create(), new Float32Array(1)).length;

class GlModelRendererModule extends GlModule {
	private modelRendererProgram: ProgramName = 'mainProgram';
	private modelRendererBuffer!: string;
	private models: ModelData[] = [];
	private instances: ModelID[] = [];
	private instanceMatrices = new InstanceMatrixArray(100);
	private vertexData = new VertexDataArray();
	private viewProjection = mat4.multiply(
		mat4.create(),
		mat4.perspective(mat4.create(), 45 * (3.141592 / 180), 16 / 9, 0.1, 800.0),
		mat4.lookAt(mat4.create(), vec3.fromValues(0, 100, 450), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0))
	);


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

	public setViewProjection(viewProjection: mat4) {
		this.viewProjection = viewProjection;
	}

	// ===== GlModule hooks

	protected setup() {
		if (!this.modelRendererBuffer) {
			this.core.createBuffer('modelRendererBuffer');
			this.modelRendererBuffer = 'modelRendererBuffer';
		}
	}

	public nextFrame() {
		this.core.useProgram(this.modelRendererProgram);
		this.core.enable(WebGLRenderingContext.DEPTH_TEST);

		this.core.bindBuffer(this.modelRendererBuffer);

		if (this.clearColor) { this.core.clearViewport(this.clearColor); }

		const vertexDataObj = this.vertexData.getData();
		if (vertexDataObj.changed) {
			this.core.setBufferDataStaticDraw(vertexDataObj.data);
		}

		this.core.setVertexAttribPointer(this.modelRendererProgram, 'position', 3, WebGLRenderingContext.FLOAT, false, VERTEXDATALENGTH, 0);
		// tslint:disable-next-line: max-line-length
		this.core.setVertexAttribPointer(this.modelRendererProgram, 'normal', 3, WebGLRenderingContext.FLOAT, false, VERTEXDATALENGTH, 3 * SIZE_FLOAT);
		// tslint:disable-next-line: max-line-length
		this.core.setVertexAttribPointer(this.modelRendererProgram, 'instanceIndex', 1, WebGLRenderingContext.FLOAT, false, VERTEXDATALENGTH, 6 * SIZE_FLOAT);

		this.core.setUniformMatrix(this.modelRendererProgram, 'modelMatrices', 4, this.instanceMatrices.getData());
		this.core.setUniformMatrix(this.modelRendererProgram, 'viewProjection', 4, this.viewProjection);

		this.core.drawArrays(WebGLRenderingContext.TRIANGLES, 0, vertexDataObj.numVertices);
	}
}

export {
	// classes
	GlModelRendererModule as ModelRenderer
};
