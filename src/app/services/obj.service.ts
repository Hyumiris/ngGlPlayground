import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { vec2, vec3 } from 'gl-matrix';
import { from, Observable } from 'rxjs';
import { filter, last, map, mergeMap, reduce, tap } from 'rxjs/operators';
import { IModelData, IModelLoader } from './model-loader.service';

interface IIntermediateFace {
	position: number[];
	normal: number[];
	texCoords: number[];
}

@Injectable({
	providedIn: 'root'
})
export class ObjService implements IModelLoader {

	private readonly lineSplitRe = /([^\s]+)/g;

	private handlers: { [type: string]: (parts: string[]) => unknown } = {
		v: (parts: string[]) => vec3.fromValues.apply(null, parts.map(parseFloat)),
		vn: (parts: string[]) => vec3.fromValues.apply(null, parts.map(parseFloat)),
		vt: (parts: string[]) => vec2.fromValues.apply(null, parts.map(parseFloat)),
		f: (parts: string[]) => {
			const vertComponents = parts.map(s => s.split('/').map(parseFloat));
			return {
				position: vertComponents.map(c => c[0]),
				texCoords: vertComponents.map(c => c[1]),
				normal: vertComponents.map(c => c[2])
			};
		},
	};

	private ensureTriangles: ((f: IIntermediateFace) => IIntermediateFace[])[] = [
		() => { throw new Error('not enough vertices'); },
		() => { throw new Error('not enough vertices'); },
		() => { throw new Error('can\'t handle 2 component vertices'); },
		(input) => [input],
		(input) => {
			const retVal: IIntermediateFace[] = [{ position: [], texCoords: [], normal: [] }, { position: [], texCoords: [], normal: [] }];
			retVal[0].position = [input.position[0], input.position[1], input.position[2]];
			retVal[0].texCoords = [input.texCoords[0], input.texCoords[1], input.texCoords[2]];
			retVal[0].normal = [input.normal[0], input.normal[1], input.normal[2]];

			retVal[1].position = [input.position[2], input.position[3], input.position[0]];
			retVal[1].texCoords = [input.texCoords[2], input.texCoords[3], input.texCoords[0]];
			retVal[1].normal = [input.normal[2], input.normal[3], input.normal[0]];

			return retVal;
		}
	];

	constructor(private http: HttpClient) { }

	public loadModel(path: string): Observable<IModelData> {

		const buffer: { [type: string]: unknown[] } = {
			v: [vec3.create()],
			vn: [vec3.create()],
			vt: [vec2.create()],
			f: [] as IIntermediateFace[]
		};

		return this.http.get(path, { responseType: 'text' }).pipe(
			mergeMap(rawStr => from(rawStr.split('\n').map(line => line.trim()))),
			filter(line => !(line === '' || line.startsWith('#'))),
			map(line => line.match(this.lineSplitRe) as RegExpMatchArray),
			filter(([type]) => (type in buffer)),
			tap(([type, ...parts]) => buffer[type].push(this.handlers[type](parts))),
			last(), // at this point all lines have been parsed
			mergeMap(() => from(buffer.f as IIntermediateFace[])),
			mergeMap(({ position, ...other }) => this.ensureTriangles[position.length]({ position, ...other })),
			reduce((acc, { position, normal, texCoords }) => {
				acc.position.push(...position.map(idx => buffer.v[idx] as vec3));
				acc.normal.push(...normal.map(idx => (buffer.vn[idx] || vec3.fromValues(1, 0, 0)) as vec3));
				acc.texCoords.push(...texCoords.map(idx => buffer.vt[idx] as vec2));
				return acc;
			}, this.baseIModelData()),
			tap((m: IModelData) => {
				buffer.v.forEach((v: vec3) => {
					m.X.min = Math.min(m.X.min, v[0]);
					m.X.max = Math.max(m.X.max, v[0]);
					m.Y.min = Math.min(m.Y.min, v[1]);
					m.Y.max = Math.max(m.Y.max, v[1]);
					m.Z.min = Math.min(m.Z.min, v[2]);
					m.Z.max = Math.max(m.Z.max, v[2]);
				});
			})
		) as Observable<IModelData>;
	}

	private baseIModelData(): IModelData {
		return {
			position: [] as vec3[],
			normal: [] as vec3[],
			texCoords: [] as vec2[],
			X: { min: Infinity, max: -Infinity },
			Y: { min: Infinity, max: -Infinity },
			Z: { min: Infinity, max: -Infinity }
		};
	}








	public parseOBJ(text: string) {
		// because indices are base 1 let's just fill in the 0th data
		const objPositions = [[0, 0, 0]];
		const objTexcoords = [[0, 0]];
		const objNormals = [[0, 0, 0]];

		// same order as `f` indices
		const objVertexData = [
			objPositions,
			objTexcoords,
			objNormals
		];

		// same order as `f` indices
		const webglVertexData: [number[], number[], number[]] = [
			[],   // positions
			[],   // texcoords
			[],   // normals
		];

		function addVertex(vert: string) {
			const ptn = vert.split('/');
			ptn.forEach((objIndexStr, i) => {
				if (!objIndexStr) {
					return;
				}
				const objIndex = parseInt(objIndexStr, 10);
				const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
				webglVertexData[i].push(...objVertexData[i][index]);
			});
		}

		const keywords: { [k: string]: (data: string[]) => void } = {
			v(parts: string[]) {
				objPositions.push(parts.map(parseFloat));
			},
			vn(parts: string[]) {
				objNormals.push(parts.map(parseFloat));
			},
			vt(parts: string[]) {
				// should check for missing v and extra w?
				objTexcoords.push(parts.map(parseFloat));
			},
			f(parts: string[]) {
				const numTriangles = parts.length - 2;
				for (let tri = 0; tri < numTriangles; ++tri) {
					addVertex(parts[0]);
					addVertex(parts[tri + 1]);
					addVertex(parts[tri + 2]);
				}
			},
		};

		const keywordRE = /(\w*)(?: )*(.*)/;
		const lines = text.split('\n');
		for (const rawLine of lines) {
			const line = rawLine.trim();
			// for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
			// 	const line = lines[lineNo].trim();
			if (line === '' || line.startsWith('#')) {
				continue;
			}
			const m = keywordRE.exec(line);
			if (!m) {
				continue;
			}
			const [, keyword, unparsedArgs] = m;
			const parts = line.split(/\s+/).slice(1);
			const handler = keywords[keyword] as (data: string[]) => void;
			if (!handler) {
				console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
				continue;
			}
			handler(parts);
		}

		return {
			position: webglVertexData[0],
			texcoord: webglVertexData[1],
			normal: webglVertexData[2],
		};
	}
}
