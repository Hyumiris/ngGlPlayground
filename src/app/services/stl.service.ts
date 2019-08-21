import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { IVertexData } from '../types/types';
import { vec3 } from 'gl-matrix';

@Injectable({
	providedIn: 'root'
})
export class StlService {

	constructor(
		private http: HttpClient
	) { (window as any).stl = this; }

	public loadModel(path: string) {
		return this.http.get(path, { responseType: 'arraybuffer' }).pipe(
			map(data => {
				const dataView = new DataView(data);
				const numberPrimitives = dataView.getInt32(80, true);
				const vertices = new Array<IVertexData>(numberPrimitives * 3);

				const basicOffset = 84;
				const sizePerPrimitive = 50;

				const normalOffset = 0;
				const firstVertexOffset = 12;
				const secondVertexOffset = 24;
				const thirdVertexOffset = 36;

				const color = vec3.fromValues(.5, .5, .5);

				for (let i = 0; i < numberPrimitives; ++i) {
					const primitiveOffset = basicOffset + (i * sizePerPrimitive);

					const vertex0 = vec3.fromValues(
						dataView.getFloat32(primitiveOffset + firstVertexOffset + 0, true),
						dataView.getFloat32(primitiveOffset + firstVertexOffset + 4, true),
						dataView.getFloat32(primitiveOffset + firstVertexOffset + 8, true)
					);
					const vertex1 = vec3.fromValues(
						dataView.getFloat32(primitiveOffset + secondVertexOffset + 0, true),
						dataView.getFloat32(primitiveOffset + secondVertexOffset + 4, true),
						dataView.getFloat32(primitiveOffset + secondVertexOffset + 8, true)
					);
					const vertex2 = vec3.fromValues(
						dataView.getFloat32(primitiveOffset + thirdVertexOffset + 0, true),
						dataView.getFloat32(primitiveOffset + thirdVertexOffset + 4, true),
						dataView.getFloat32(primitiveOffset + thirdVertexOffset + 8, true)
					);

					const normalCalculated = vec3.create();
					const diff1 = vec3.create();
					const diff2 = vec3.create();
					vec3.cross(normalCalculated, vec3.sub(diff1, vertex0, vertex1), vec3.sub(diff2, vertex0, vertex2));
					vec3.normalize(normalCalculated, normalCalculated);

					const normal = vec3.fromValues(
						dataView.getFloat32(primitiveOffset + normalOffset + 0, true),
						dataView.getFloat32(primitiveOffset + normalOffset + 4, true),
						dataView.getFloat32(primitiveOffset + normalOffset + 8, true)
					);
					vec3.normalize(normal, normal);

					vertices[(i * 3) + 0] = { position: vertex0, normal, color, normalCalculated };
					vertices[(i * 3) + 1] = { position: vertex1, normal, color, normalCalculated };
					vertices[(i * 3) + 2] = { position: vertex2, normal, color, normalCalculated };
				}
				return vertices;
			})
		);
	}
}
