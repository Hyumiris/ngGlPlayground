import { mat4 } from 'gl-matrix';
import { Observable, map } from 'rxjs';
import { ModelData } from '../ModelLoader/ModelLoader.types';
import { loadObjModel } from '../ModelLoader/obj.loader';
import { MaterialBuffer } from './MaterialBuffer';
import { WebGlFacade } from './WebGlFacade';

export class ModelInstance {

	constructor(private modelMatrix = mat4.create()) {}

	public get model() {
		return this.modelMatrix;
	}

	public get normal() {
		const tmp = mat4.create();
		mat4.invert(tmp, this.modelMatrix);
		mat4.transpose(tmp, tmp);
		return tmp;
	}

	public setMatrix(mat: mat4) {
		mat4.copy(this.modelMatrix, mat);
	}

	/**
	 * Performs matrix multiplication: transform * instanceMatrix.
	 * Stores the result as the new instance matrix.
	 * @param transform the transformation matrix
	 */
	public transformMatrix(transform: mat4) {
		mat4.multiply(this.modelMatrix, transform, this.modelMatrix);
	}
}

declare const ModelIDTag: unique symbol;
type ModelID = number & { [ModelIDTag]: typeof ModelIDTag; };

export class ModelManager {

	private models: ModelData[] = [];
	private materials = new Map<string, MaterialBuffer>();

	constructor() {}

	loadModel(path: string): Observable<ModelID> {
		switch (path.substring(path.lastIndexOf('.') + 1)) {
			case 'obj':
				return loadObjModel(path).pipe(
					map(modelData => (this.models.push(modelData) - 1) as ModelID)
				);
				break;
			default:
				throw new Error(`filetype of "${path}" not supported`);
				break;
		}
	}

	getModel(model: ModelID) {
		return this.models[model];
	}

	instantiate(gl: WebGlFacade, model: ModelID, instanceMatrix?: mat4) {
		const modelData = this.models[model];
		const instance = new ModelInstance(instanceMatrix);

		modelData.materials.forEach((material, materialName) => {
			if (!this.materials.has(materialName)) {
				this.materials.set(materialName, new MaterialBuffer(gl, material));
			}

			const materialBuffer = this.materials.get(materialName);
			const data = modelData.data.get(materialName);

			// tslint:disable-next-line: no-non-null-assertion
			materialBuffer!.addInstance(instance, data!);
		});

		return instance;
	}

	nextFrame(gl: WebGlFacade, program: WebGLProgram, buffer: WebGLBuffer | null) {
		const opaqueMatBufs = [...this.materials.values()].filter(buf => !buf.isTransparent());
		const transparentMatBufs = [...this.materials.values()].filter(buf => buf.isTransparent());

		gl.disableAlphaBlending();
		for (const matBuffer of opaqueMatBufs) {
			matBuffer.setProperties(gl, program, buffer, true);
			gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, matBuffer.numVertices());
		}

		gl.enableAlphaBlending();
		for (const matBuffer of transparentMatBufs) {
			matBuffer.setProperties(gl, program, buffer, true);
			gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, matBuffer.numVertices());
		}
	}

}
