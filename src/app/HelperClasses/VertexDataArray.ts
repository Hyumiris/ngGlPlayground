import { concatenate } from '../helper/glMatrixHelper';
import { ModelData } from '../types/types';

/**
 * manages the vertex data that gets stored in the buffer
 */
export class VertexDataArray {
	private vertexDataChanged = false;
	private vertexData = new Float32Array();
	private numVertices = 0;

	public getNumVertices() {
		return this.numVertices;
	}

	public getData(resetChangedFlag = true) {
		const retVal = {
			data: this.vertexData,
			changed: this.vertexDataChanged
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
