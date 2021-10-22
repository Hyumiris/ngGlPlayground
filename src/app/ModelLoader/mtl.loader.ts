import { vec3 } from 'gl-matrix';
import { from } from 'rxjs';
import { filter, map, mergeMap, pluck, reduce } from 'rxjs/operators';
import { computeRelativePath, loadTextFile } from '../helper/fileLoader';
import { IMaterial, IMaterialGroup } from './ModelLoader.types';

// ==============================================================================================
// ================================== SUPPORT STRUCTURES ========================================
// ==============================================================================================

const lineSplitRe = /([^\s]+)/g;

// some other related stuff: 'Ke', 'Ni', 'd', 'map_Ke', 'refl', 'illum'
const lineTypes = ['newmtl', 'Ka', 'Kd', 'Ks', 'Ns', 'map_Kd', 'map_Bump', 'map_Ks'] as const;
type LineType = (typeof lineTypes)[number];

interface IMaterialGroupAccumulator { group: IMaterialGroup; currentMtl: string; path: string; }
const getMaterialGroupAcc = (path: string): IMaterialGroupAccumulator => ({ group: {}, currentMtl: '', path });

const createMaterial = (): IMaterial => ({ ambient: vec3.create(), diffuse: vec3.create(), specular: vec3.create(), specular_exp: 0 });

const lineHandler: { [type in LineType]: (acc: IMaterialGroupAccumulator, parts: string[]) => IMaterialGroupAccumulator } = {
	// create new material
	newmtl: (acc, [name]) => {
		if (acc.group[name]) { throw new Error(`material ${name} does already exist`); }
		acc.group[name] = createMaterial();
		acc.currentMtl = name;
		return acc;
	},
	Ka: (acc, parts) => (acc.group[acc.currentMtl].ambient = vec3.fromValues.apply(null, parts.map(parseFloat)) as vec3, acc),
	Kd: (acc, parts) => (acc.group[acc.currentMtl].diffuse = vec3.fromValues.apply(null, parts.map(parseFloat)) as vec3, acc),
	Ks: (acc, parts) => (acc.group[acc.currentMtl].specular = vec3.fromValues.apply(null, parts.map(parseFloat)) as vec3, acc),
	Ns: (acc, parts) => (acc.group[acc.currentMtl].specular_exp = parseFloat(parts[0]), acc),
	map_Kd: (acc, [path]) => {
		const fullPath = computeRelativePath(acc.path, path);
		if (acc.group[acc.currentMtl].color_map === fullPath) { return acc; }
		if (acc.group[acc.currentMtl].color_map) { throw new Error('no support for different Kd/Ks maps yet'); }
		acc.group[acc.currentMtl].color_map = fullPath;
		return acc;
	},
	map_Ks: (acc, [path]) => {
		const fullPath = computeRelativePath(acc.path, path);
		if (acc.group[acc.currentMtl].color_map === fullPath) { return acc; }
		if (acc.group[acc.currentMtl].color_map) { throw new Error('no support for different Kd/Ks maps yet'); }
		acc.group[acc.currentMtl].color_map = fullPath;
		return acc;
	},
	map_Bump: (acc, [path]) => (acc.group[acc.currentMtl].bump_map = computeRelativePath(acc.path, path), acc)
};

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
		filter(([type, ...parts]) => lineTypes.includes(type as LineType)), // this `as LineType` is technically what i am testing for
		// parse each line
		reduce((materials, [type, ...parts]: [LineType, ...string[]]) => lineHandler[type](materials, parts), getMaterialGroupAcc(path)),
		// return only materials
		pluck('group')
	);
}
