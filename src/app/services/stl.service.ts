import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { IVertexData } from '../types/types';
import { vec3 } from 'gl-matrix';

@Injectable({
	providedIn: 'root'
})
export class StlService {

	private normalOffset = 0;
	private firstVertexOffset = 12;
	private secondVertexOffset = 24;
	private thirdVertexOffset = 36;

	private basicOffset = 84;
	private sizePerPrimitive = 50;

	constructor(
		private http: HttpClient
	) { (window as any).stl = this; }

	public loadModel(path: string) {
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
				const vertices = new Array<IVertexData>(numberPrimitives * 3);

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

					const normal = vec3.fromValues(
						dataView.getFloat32(primitiveOffset + this.normalOffset + 0, true),
						dataView.getFloat32(primitiveOffset + this.normalOffset + 4, true),
						dataView.getFloat32(primitiveOffset + this.normalOffset + 8, true)
					);
					if (vec3.length(normal) === 0) {
						vec3.cross(normal, vec3.sub(vec3.create(), vertex0, vertex1), vec3.sub(vec3.create(), vertex0, vertex2));
						vec3.normalize(normal, normal);
					}
					if (Math.abs(vec3.length(normal) - 1) > 0.0001) {
						vec3.normalize(normal, normal);
					}

					minX = Math.min(minX, vertex0[0], vertex1[0], vertex2[0]);
					maxX = Math.max(maxX, vertex0[0], vertex1[0], vertex2[0]);
					minY = Math.min(minY, vertex0[1], vertex1[1], vertex2[1]);
					maxY = Math.max(maxY, vertex0[1], vertex1[1], vertex2[1]);
					minZ = Math.min(minZ, vertex0[2], vertex1[2], vertex2[2]);
					maxZ = Math.max(maxZ, vertex0[2], vertex1[2], vertex2[2]);

					vertices[(i * 3) + 0] = { position: vertex0, normal };
					vertices[(i * 3) + 1] = { position: vertex1, normal };
					vertices[(i * 3) + 2] = { position: vertex2, normal };
				}
				return {
					vertices,
					X: { min: minX, max: maxX },
					Y: { min: minY, max: maxY },
					Z: { min: minZ, max: maxZ }
				};
			})
		);
	}
}
