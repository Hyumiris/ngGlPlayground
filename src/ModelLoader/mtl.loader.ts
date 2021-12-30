import { vec3 } from 'gl-matrix';
import { from, filter, map, mergeMap, pluck, reduce } from 'rxjs';
import { computeRelativePath, loadTextFile } from '../helper/fileLoader';
import { IMaterial } from './ModelLoader.types';

// ==============================================================================================
// ================================== SUPPORT STRUCTURES ========================================
// ==============================================================================================

const lineSplitRe = /([^\s]+)/g;

// some other related stuff: 'Ke', 'Ni', 'd', 'map_Ke', 'refl', 'illum'
const lineTypes = ['newmtl', 'Ka', 'Kd', 'Ks', 'Ns', 'd', 'map_Kd', 'map_Bump', 'map_Ks', 'illum'] as const;
type LineType = (typeof lineTypes)[number];

interface IMaterialGroupAccumulator { group: Map<string, IMaterial>; currentMtl: string; path: string; }
const getMaterialGroupAcc = (path: string): IMaterialGroupAccumulator => ({ group: new Map<string, IMaterial>(), currentMtl: '', path });

const createMaterial = (): IMaterial => ({ ambient: vec3.create(), diffuse: vec3.create(), specular: vec3.create(), specular_exp: 0, opacity: 1, illum: 2 });

// tslint:disable: no-non-null-assertion
const lineHandler: { [type in LineType]: (acc: IMaterialGroupAccumulator, parts: string[]) => IMaterialGroupAccumulator } = {
	// create new material
	newmtl: (acc, [name]) => {
		if (acc.group.has(name)) { throw new Error(`material ${name} does already exist`); }
		acc.group.set(name, createMaterial());
		acc.currentMtl = name;
		return acc;
	},
	Ka: (acc, parts) => (acc.group.get(acc.currentMtl)!.ambient = vec3.fromValues.apply(null, parts.map(parseFloat) as any), acc),
	Kd: (acc, parts) => (acc.group.get(acc.currentMtl)!.diffuse = vec3.fromValues.apply(null, parts.map(parseFloat) as any), acc),
	Ks: (acc, parts) => (acc.group.get(acc.currentMtl)!.specular = vec3.fromValues.apply(null, parts.map(parseFloat) as any), acc),
	Ns: (acc, parts) => (acc.group.get(acc.currentMtl)!.specular_exp = parseFloat(parts[0]), acc),
	d: (acc, parts) => (acc.group.get(acc.currentMtl)!.opacity = parseFloat(parts[0]), acc),
	map_Kd: (acc, [path]) => {
		const fullPath = computeRelativePath(acc.path, path);
		if (acc.group.get(acc.currentMtl)!.color_map === fullPath) { return acc; }
		if (acc.group.get(acc.currentMtl)!.color_map) { throw new Error('no support for different Kd/Ks maps yet'); }
		acc.group.get(acc.currentMtl)!.color_map = fullPath;
		return acc;
	},
	map_Ks: (acc, [path]) => {
		const fullPath = computeRelativePath(acc.path, path);
		if (acc.group.get(acc.currentMtl)!.color_map === fullPath) { return acc; }
		if (acc.group.get(acc.currentMtl)!.color_map) { throw new Error('no support for different Kd/Ks maps yet'); }
		acc.group.get(acc.currentMtl)!.color_map = fullPath;
		return acc;
	},
	map_Bump: (acc, [path]) => (acc.group.get(acc.currentMtl)!.bump_map = computeRelativePath(acc.path, path), acc),
	illum: (acc, [illumID]) => (acc.group.get(acc.currentMtl)!.illum = parseInt(illumID), acc)
};
// tslint:enable: no-non-null-assertion

// ==============================================================================================
// ======================================= FUNCTIONS ===========================================
// ==============================================================================================

export function loadMaterials(path: string) {
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
		reduce((materials, [type, ...parts]: [LineType, ...string[]]) => lineHandler[type](materials, parts), getMaterialGroupAcc(path)),
		// return only materials
		pluck('group')
	);
}
