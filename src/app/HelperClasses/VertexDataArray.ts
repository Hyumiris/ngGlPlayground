import { concatenate } from '../helper/glMatrixHelper';
import { ModelData } from '../types/types';

export class VertexDataArray {
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
