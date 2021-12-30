import { Observable } from 'rxjs';

interface PathWithSep { path: string; sep: string; }

/**
 * Checks whether `path` contains '/' or '\\'.\
 * If it contains one that is selected as the seperator, in case neither is found the default is selected.\
 * If both are found an error is thrown.
 */
function parsePathSep(path: string, defaultSep = '/'): PathWithSep {
	let sep = defaultSep;
	const altSep = sep === '/' ? '\\' : '/';
	if (path.includes(altSep)) {
		if (path.includes(sep)) { throw new Error(`can't identify path seperator for "${path}"`); }
		sep = altSep;
	}
	return { path, sep };
}

export function computeRelativePath(basePath: string | PathWithSep, relativePath: string | PathWithSep, sep = '/') {
	basePath = (typeof basePath !== 'string') ? basePath : parsePathSep(basePath);
	relativePath = (typeof relativePath !== 'string') ? relativePath : parsePathSep(relativePath);

	const splitBasePath = basePath.path.split(basePath.sep).filter(s => s);
	const splitRelativePath = relativePath.path.split(relativePath.sep).filter(s => s);

	// remove file at the end of the path if present
	if (splitBasePath[splitBasePath.length - 1].includes('.')) {
		splitBasePath.splice(splitBasePath.length - 1);
	}

	const fullPath = splitBasePath.concat(splitRelativePath);

	return fullPath.reduce((acc, value) => {
		if (value === '.') { return acc; }
		if (value === '..' && acc.length > 0 && acc[acc.length - 1] !== '..') { return acc.slice(0, acc.length - 1); }
		return acc.concat(value);
	}, [] as string[]).join(sep);
}

export function loadTextFile(path: string) {
	return new Observable<string>(observer => {
		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = () => {
			if (xhr.readyState !== 4) { return; }
			if (xhr.status >= 200 && xhr.status < 300) {
				xhr.onreadystatechange = null;
				observer.next(xhr.responseText);
				observer.complete();
			} else {
				observer.error(xhr);
			}
		};
		xhr.open('GET', path);
		xhr.send();
	});
}
