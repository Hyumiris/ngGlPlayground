import { vec2, vec3 } from 'gl-matrix';
import { forkJoin, from, Observable } from 'rxjs';
import { defaultIfEmpty, filter, map, mergeAll, mergeMap, reduce, tap } from 'rxjs/operators';
import { computeRelativePath, loadTextFile } from '../helper/fileLoader';
import { IMaterialGroup, IModelData } from './ModelLoader.types';
import { loadMaterials } from './mtl.loader';

// ==============================================================================================
// ====================================== TYPES =================================================
// ==============================================================================================

const lineTypes = ['v', 'vn', 'vt', 'f', 'mtllib', 'usemtl'] as const;
type LineType = (typeof lineTypes)[number];

interface IFace {
	/** 0-indeces for v in the IAccumulatingObj */
	position: number[];
	/** 0-indeces for vt in the IAccumulatingObj */
	texCoords: number[];
	/** 0-indeces for vn in the IAccumulatingObj */
	normal: number[];
	usemtl: string;
}

interface IAccumulatingObj {
	path: string;
	v: vec3[];
	vn: vec3[];
	vt: vec2[];
	f: IFace[];
	materials: IMaterialGroup;
	usemtl: string;
	mtllibs: Observable<IMaterialGroup>[];
}

// ==============================================================================================
// ================================== SUPPORT STRUCTURES ========================================
// ==============================================================================================

const lineSplitRe = /([^\s]+)/g;

const getAccObj = (path: string): IAccumulatingObj => ({ path, v: [], vt: [], vn: [], f: [], materials: {}, usemtl: '', mtllibs: [] });

const baseModelData = (): IModelData => ({
	position: [] as vec3[],
	normal: [] as vec3[],
	texCoords: [] as vec2[],
	X: { min: Infinity, max: -Infinity },
	Y: { min: Infinity, max: -Infinity },
	Z: { min: Infinity, max: -Infinity }
});

const normalizeFaceIndex = (idx: number, type: 'v' | 'vt' | 'vn', acc: IAccumulatingObj) => {
	return idx > 0
		? idx - 1
		: acc[type].length + idx;
};

const lineHandler: { [type in LineType]: (acc: IAccumulatingObj, parts: string[]) => any } = {
	// List of geometric vertices, `x y z [w]`, w is optional and defaults to 1.0.
	v: (acc, parts) => acc.v.push(vec3.fromValues.apply(null, parts.map(parseFloat)) as vec3),
	// List of texture coordinates, `u [v [w]]`, these will vary between 0 and 1. v, w are optional and default to 0.
	vt: (acc, parts) => acc.vt.push(vec2.fromValues.apply(null, parts.map(parseFloat)) as vec2),
	// List of vertex normals, `x y z`; normals might not be unit vectors.
	vn: (acc, parts) => acc.vn.push(vec3.fromValues.apply(null, parts.map(parseFloat)) as vec3),
	// roughly `v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3` with 1 indeces
	f: (acc, parts) => {
		acc.f.push(parts.map(s => s.split('/').map(parseFloat)).reduce((face, [v, vt, vn]) => {
			face.position.push(normalizeFaceIndex(v, 'v', acc));
			face.texCoords.push(normalizeFaceIndex(vt, 'vt', acc));
			face.normal.push(normalizeFaceIndex(vn, 'vn', acc));
			return face;
		}, { position: [], texCoords: [], normal: [], usemtl: acc.usemtl } as IFace));
	},
	// mtl file to be used to resolve materials
	mtllib: (acc, [path]) => acc.mtllibs.push(loadMaterials(computeRelativePath(acc.path, path))),
	// which material to use for the following faces
	usemtl: (acc, [name]) => acc.usemtl = name
};

/** takes a face and returns an array of triangular faces which are together equivalent to the original face */
const asTriangleFaces: ((f: IFace) => IFace[])[] = [
	() => { throw new Error('not enough vertices'); },
	() => { throw new Error('not enough vertices'); },
	() => { throw new Error('can\'t handle 2 component vertices'); },
	(input) => [input],
	(input) => {
		const retVal: IFace[] = [
			{ position: [], texCoords: [], normal: [], usemtl: input.usemtl },
			{ position: [], texCoords: [], normal: [], usemtl: input.usemtl }
		];
		retVal[0].position = [input.position[0], input.position[1], input.position[2]];
		retVal[0].texCoords = [input.texCoords[0], input.texCoords[1], input.texCoords[2]];
		retVal[0].normal = [input.normal[0], input.normal[1], input.normal[2]];

		retVal[1].position = [input.position[2], input.position[3], input.position[0]];
		retVal[1].texCoords = [input.texCoords[2], input.texCoords[3], input.texCoords[0]];
		retVal[1].normal = [input.normal[2], input.normal[3], input.normal[0]];

		return retVal;
	}
];

// ==============================================================================================
// ======================================= FUNCTIONS ===========================================
// ==============================================================================================

export function loadObjModel(path: string) {
	return loadTextFile(path).pipe(
		// split by line
		mergeMap(rawStr => from(rawStr.split('\n').map(line => line.trim()))),
		// ignore empty lines
		filter(line => line !== ''),
		// split each line into its components
		map(line => line.match(lineSplitRe) as RegExpMatchArray),
		// ignore unhandled properties,
		filter(([type, ...parts]) => lineTypes.includes(type as LineType)), // this `as LineType` is technically what i am testing for
		// parse each line
		reduce((acc, [type, ...parts]: [LineType, ...string[]]) => (lineHandler[type](acc, parts), acc), getAccObj(path)),
		// load the mtl libraries
		mergeMap(acc => forkJoin(acc.mtllibs).pipe(
			defaultIfEmpty<IMaterialGroup[]>([]),
			mergeAll(),
			reduce((materials, materialGroup) => Object.assign(materials, materialGroup)),
			tap(materials => acc.materials = materials),
			map(() => acc)
		)),
		// parse each face
		mergeMap(acc => from(acc.f).pipe(
			// split non triangle faces into triangles
			mergeMap((face) => asTriangleFaces[face.position.length](face)),
			// put each face into the final model data
			reduce((modelData, { position, normal, texCoords }) => {
				modelData.position.push(...position.map(idx => acc.v[idx]));
				modelData.normal.push(...normal.map(idx => (acc.vn[idx])));
				modelData.texCoords.push(...texCoords.map(idx => acc.vt[idx]));
				return modelData;
			}, baseModelData()),
			// calculate mins and maxs of the model
			tap(modelData => {
				const xCoords = acc.v.map(v => v[0]);
				const yCoords = acc.v.map(v => v[1]);
				const zCoords = acc.v.map(v => v[2]);
				modelData.X = { min: Math.min.apply(Math, xCoords), max: Math.max.apply(Math, xCoords) };
				modelData.Y = { min: Math.min.apply(Math, yCoords), max: Math.max.apply(Math, yCoords) };
				modelData.Z = { min: Math.min.apply(Math, zCoords), max: Math.max.apply(Math, zCoords) };
				Object.assign(modelData, { acc });
			})
		))
	);
}
