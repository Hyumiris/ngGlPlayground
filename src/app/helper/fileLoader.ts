import { Observable } from 'rxjs';

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
