import { Observable } from 'rxjs';
import { IModelData } from '../types/types';

export interface IModelLoader {
	loadModel(path: string): Observable<IModelData>;
}
