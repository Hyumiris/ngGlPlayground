import { vec2, vec3 } from 'gl-matrix';
import { forkJoin, from, Observable, defaultIfEmpty, filter, map, mergeAll, mergeMap, reduce, tap } from 'rxjs';
import { computeRelativePath, loadTextFile } from '../helper/fileLoader';
import { IFace, IMaterial, IModelDataBase, ModelData } from './ModelLoader.types';
import { loadMaterials } from './mtl.loader';

// ==============================================================================================
// ====================================== TYPES =================================================
// ==============================================================================================

const lineTypes = ['v', 'vn', 'vt', 'f', 'mtllib', 'usemtl'] as const;
type LineType = (typeof lineTypes)[number];

interface IObjBuffer {
	path: string;
	material: string;
	mtllibs: Observable<Map<string, IMaterial>>[];
	v: vec3[];
	vn: vec3[];
	vt: vec2[];
	faces: IFace[];
	materials: Map<string, IMaterial>;
}

// ==============================================================================================
// ================================== SUPPORT STRUCTURES ========================================
// ==============================================================================================

const lineSplitRe = /([^\s]+)/g;

const getAccObj = (path: string): IObjBuffer => ({
	path,
	v: [],
	vt: [],
	vn: [],
	faces: [],
	materials: new Map<string, IMaterial>(),
	material: '',
	mtllibs: []
});

const baseModelData = (materials: Map<string, IMaterial>): ModelData => ({
	materials,
	data: new Map<string, IModelDataBase>([...materials.keys()].map(k => [k, { position: [], normal: [], texCoords: [] }])),
	X: { min: Infinity, max: -Infinity },
	Y: { min: Infinity, max: -Infinity },
	Z: { min: Infinity, max: -Infinity }
});

const normalizeFaceIndex = (idx: number, type: 'v' | 'vt' | 'vn', acc: IObjBuffer) => idx > 0 ? idx - 1 : acc[type].length + idx;

const lineHandler: { [type in LineType]: (acc: IObjBuffer, parts: string[]) => any } = {
	// List of geometric vertices, `x y z [w]`, w is optional and defaults to 1.0.
	v: (acc, parts) => acc.v.push(vec3.fromValues.apply(null, parts.map(parseFloat) as any)),
	// List of texture coordinates, `u [v [w]]`, these will vary between 0 and 1. v, w are optional and default to 0.
	vt: (acc, parts) => acc.vt.push(vec2.fromValues.apply(null, parts.map(parseFloat) as any)),
	// List of vertex normals, `x y z`; normals might not be unit vectors.
	vn: (acc, parts) => acc.vn.push(vec3.fromValues.apply(null, parts.map(parseFloat) as any)),
	// roughly `v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3` with 1 indeces
	f: (acc, parts) => {
		acc.faces.push(parts.map(s => s.split('/').map(parseFloat)).reduce((face, [v, vt, vn]) => {
			face.position.push(normalizeFaceIndex(v, 'v', acc));
			face.texCoords.push(normalizeFaceIndex(vt, 'vt', acc));
			face.normal.push(normalizeFaceIndex(vn, 'vn', acc));
			return face;
		}, { position: [], texCoords: [], normal: [], material: acc.material } as IFace));
	},
	// mtl file to be used to resolve materials
	mtllib: (acc, [path]) => acc.mtllibs.push(loadMaterials(computeRelativePath(acc.path, path))),
	// which material to use for the following faces
	usemtl: (acc, [name]) => acc.material = name
};

/** takes a face and returns an array of triangular faces which are together equivalent to the original face */
const asTriangleFaces: ((f: IFace) => IFace[]) = (face: IFace) => {
	return ([
		() => { throw new Error('not enough vertices'); },
		() => { throw new Error('not enough vertices'); },
		() => { throw new Error('can\'t handle 2 component vertices'); },
		(input: IFace) => [input],
		(input: IFace) => [{
			position: [input.position[0], input.position[1], input.position[2]],
			texCoords: [input.texCoords[0], input.texCoords[1], input.texCoords[2]],
			normal: [input.normal[0], input.normal[1], input.normal[2]],
			material: input.material
		}, {
			position: [input.position[2], input.position[3], input.position[0]],
			texCoords: [input.texCoords[2], input.texCoords[3], input.texCoords[0]],
			normal: [input.normal[2], input.normal[3], input.normal[0]],
			material: input.material
		}]
	])[face.position.length](face);
};


// ==============================================================================================
// ======================================= FUNCTIONS ===========================================
// ==============================================================================================

export function loadObjModel(path: string): Observable<ModelData> {
	return loadTextFile(path).pipe(
		// split by line
		mergeMap(rawStr => from(rawStr.split('\n').map(line => line.trim()))),
		// ignore empty lines
		filter(line => line !== ''),
		// split each line into its components
		map(line => line.match(lineSplitRe) as RegExpMatchArray),
		// ignore unhandled properties,
		filter((match): match is [LineType, ...string[]] => lineTypes.includes(match[0] as LineType)),
		// parse each line
		reduce((acc, [type, ...parts]: [LineType, ...string[]]) => (lineHandler[type](acc, parts), acc), getAccObj(path)),
		// load the mtl libraries
		mergeMap(acc => forkJoin(acc.mtllibs).pipe(
			defaultIfEmpty(new Array<Map<string, IMaterial>>()),
			mergeAll(),
			reduce((materials, materialGroup) => new Map([...materials, ...materialGroup])),
			tap(materials => acc.materials = materials),
			map(() => acc)
		)),
		// parse each face
		mergeMap(acc => from(acc.faces).pipe(
			// split non triangle faces into triangles
			mergeMap((face) => asTriangleFaces(face)),
			// put each face into the final model data
			reduce((modelData, { position, normal, texCoords, material }) => {
				let data = modelData.data.get(material);
				if (!data) {
					data = { position: [], normal: [], texCoords: [] };
					modelData.data.set(material, data);
				}
				data.position.push(...position.map(idx => acc.v[idx]));
				data.normal.push(...normal.map(idx => (acc.vn[idx])));
				data.texCoords.push(...texCoords.map(idx => acc.vt[idx]));
				return modelData;
			}, baseModelData(acc.materials)),
			// calculate mins and maxs of the model
			tap(modelData => {
				const xCoords = acc.v.map(v => v[0]);
				const yCoords = acc.v.map(v => v[1]);
				const zCoords = acc.v.map(v => v[2]);
				modelData.X = { min: Math.min.apply(Math, xCoords), max: Math.max.apply(Math, xCoords) };
				modelData.Y = { min: Math.min.apply(Math, yCoords), max: Math.max.apply(Math, yCoords) };
				modelData.Z = { min: Math.min.apply(Math, zCoords), max: Math.max.apply(Math, zCoords) };
			})
		))
	);
}
