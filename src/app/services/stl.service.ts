import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { vec3 } from 'gl-matrix';
import { IModelLoader } from './model-loader.service';
import { Observable } from 'rxjs';
import { IModelData } from '../types/types';

@Injectable({
	providedIn: 'root'
})
export class StlService implements IModelLoader {

	private normalOffset = 0;
	private firstVertexOffset = 12;
	private secondVertexOffset = 24;
	private thirdVertexOffset = 36;

	private basicOffset = 84;
	private sizePerPrimitive = 50;

	constructor(
		private http: HttpClient
	) { (window as any).stl = this; }

	public loadModel(path: string): Observable<IModelData> {
		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;
		let minZ = Infinity;
		let maxZ = -Infinity;

		return this.http.get(path, { responseType: 'arraybuffer' }).pipe(
			map(data => {
				const dataView = new DataView(data);
				const numberPrimitives = dataView.getInt32(80, true);
				const position = new Array<vec3>(numberPrimitives * 3);
				const normal = new Array<vec3>(numberPrimitives * 3);

				for (let i = 0; i < numberPrimitives; ++i) {
					const primitiveOffset = this.basicOffset + (i * this.sizePerPrimitive);

					const vertex0 = vec3.fromValues(
						dataView.getFloat32(primitiveOffset + this.firstVertexOffset + 0, true),
						dataView.getFloat32(primitiveOffset + this.firstVertexOffset + 4, true),
						dataView.getFloat32(primitiveOffset + this.firstVertexOffset + 8, true)
					);
					const vertex1 = vec3.fromValues(
						dataView.getFloat32(primitiveOffset + this.secondVertexOffset + 0, true),
						dataView.getFloat32(primitiveOffset + this.secondVertexOffset + 4, true),
						dataView.getFloat32(primitiveOffset + this.secondVertexOffset + 8, true)
					);
					const vertex2 = vec3.fromValues(
						dataView.getFloat32(primitiveOffset + this.thirdVertexOffset + 0, true),
						dataView.getFloat32(primitiveOffset + this.thirdVertexOffset + 4, true),
						dataView.getFloat32(primitiveOffset + this.thirdVertexOffset + 8, true)
					);

					const normalVec = vec3.fromValues(
						dataView.getFloat32(primitiveOffset + this.normalOffset + 0, true),
						dataView.getFloat32(primitiveOffset + this.normalOffset + 4, true),
						dataView.getFloat32(primitiveOffset + this.normalOffset + 8, true)
					);
					if (vec3.length(normalVec) === 0) {
						vec3.cross(normalVec, vec3.sub(vec3.create(), vertex0, vertex1), vec3.sub(vec3.create(), vertex0, vertex2));
						vec3.normalize(normalVec, normalVec);
					}
					if (Math.abs(vec3.length(normalVec) - 1) > 0.0001) {
						vec3.normalize(normalVec, normalVec);
					}

					minX = Math.min(minX, vertex0[0], vertex1[0], vertex2[0]);
					maxX = Math.max(maxX, vertex0[0], vertex1[0], vertex2[0]);
					minY = Math.min(minY, vertex0[1], vertex1[1], vertex2[1]);
					maxY = Math.max(maxY, vertex0[1], vertex1[1], vertex2[1]);
					minZ = Math.min(minZ, vertex0[2], vertex1[2], vertex2[2]);
					maxZ = Math.max(maxZ, vertex0[2], vertex1[2], vertex2[2]);

					position[(i * 3) + 0] = vertex0;
					position[(i * 3) + 1] = vertex1;
					position[(i * 3) + 2] = vertex2;
					normal[(i * 3) + 0] = normalVec;
					normal[(i * 3) + 1] = normalVec;
					normal[(i * 3) + 2] = normalVec;
				}
				return {
					position,
					normal,
					X: { min: minX, max: maxX },
					Y: { min: minY, max: maxY },
					Z: { min: minZ, max: maxZ }
				};
			})
		);
	}
}
