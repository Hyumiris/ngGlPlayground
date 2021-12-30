import { vec3 } from 'gl-matrix';
import { fromEvent, interval, filter, map, mergeMap, pluck, takeUntil, tap } from 'rxjs';
import { rotate } from '../helper/glMatrixHelper';


export class CharacterPosition {

	private readonly keyDir: { [key: string]: () => vec3 } = {
		w: () => vec3.scale(vec3.create(), this.direction, this.speed),
		a: () => vec3.scale(vec3.create(), vec3.cross(vec3.create(), this.direction, this.up), -this.speed),
		s: () => vec3.scale(vec3.create(), this.direction, -this.speed),
		d: () => vec3.scale(vec3.create(), vec3.cross(vec3.create(), this.direction, this.up), this.speed)
	};

	/** always normalized */
	private up = vec3.fromValues(0, 1, 0);
	private position = vec3.create();
	/** always normalized */
	private direction = vec3.fromValues(-1, 0, 0);
	private speed = 1;

	constructor(private canvas: HTMLCanvasElement) { }

	public setup() {
		const availableKeys = ['w', 'a', 's', 'd'];
		fromEvent<KeyboardEvent>(document, 'keydown').pipe(
			pluck('key'),
			filter(key => availableKeys.includes(key)),
			tap(key => availableKeys.splice(availableKeys.indexOf(key), 1)),
			mergeMap(key => interval(50).pipe(
				takeUntil(fromEvent<KeyboardEvent>(document, 'keyup').pipe(filter((evt: KeyboardEvent) => evt.key === key), tap(() => availableKeys.push(key)))),
				map(() => this.keyDir[key]())
			)),
			tap(change => vec3.add(this.position, this.position, change))
		).subscribe();

		fromEvent<MouseEvent>(document, 'mousedown').pipe(
			mergeMap(() => fromEvent<MouseEvent>(document, 'mousemove').pipe(takeUntil(fromEvent(document, 'mouseup')))),
			tap((evt: MouseEvent) => {
				const xDiff = -evt.movementX / this.canvas.clientWidth * 2;
				const yDiff = evt.movementY / this.canvas.clientHeight * 2;

				const dir = this.getDirection();
				// vec3.rotateY(dir, dir, vec3.create(), xDiff);
				rotate(dir, dir, this.up, xDiff);
				rotate(dir, dir, vec3.cross(vec3.create(), this.up, this.direction), yDiff);
				this.setDirection(dir);
			})
		).subscribe();
	}

	public getPosition() {
		return this.position;
	}

	public setPosition(position: vec3) {
		this.position = position;
	}

	public getDirection() {
		return this.direction;
	}

	public setDirection(direction: vec3) {
		vec3.normalize(this.direction, direction);
	}

	public setSpeed(speed: number) {
		this.speed = speed;
	}

	public setUp(up: vec3) {
		vec3.normalize(this.up, up);
	}

}
