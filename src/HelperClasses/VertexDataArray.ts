import { concatenate } from '../helper/glMatrixHelper';
import { IModelData } from '../types/types';

/**
 * manages the vertex data that gets stored in the buffer(s)
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

	public addVertexData(md: IModelData, instanceIndex: number) {
		this.numVertices += md.position.length;
		const layoutedVertexData = md.position.map((p, i) => concatenate(Float32Array, p, md.normal[i], Float32Array.from([instanceIndex])));
		this.vertexData = concatenate(Float32Array, layoutedVertexData, this.vertexData);
		this.vertexDataChanged = true;
	}
}
