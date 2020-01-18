import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { mat4, vec3 } from 'gl-matrix';
import { interval } from 'rxjs';
import { tap, startWith, map, flatMap, filter } from 'rxjs/operators';
import { StlService } from './services/stl.service';
import { ModelRenderer } from './types/ModelRenderer';
import { rotate } from './helper/glMatrixHelper';
import { GlCore } from './types/GlCore';

//
// ts: [name: (number | string)]: any is not accepted even though number or string is allowed
//
// An index signature parameter type cannot be a type alias. Consider writing '[index: number]: IVertexData[]' instead.ts(1336)
//

Object.assign(window, {
	mat4
});

@Component({
	selector: 'glp-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss'],
	host: {
		class: 'size-100'
	}
})
export class AppComponent implements OnInit {
	@ViewChild('canvas', { static: true }) private canvasRef?: ElementRef<HTMLCanvasElement>;

	private _canvas?: HTMLCanvasElement;
	private get canvas() { if (!this._canvas) { throw new Error('no glContext'); } return this._canvas; }
	private set canvas(canvas: HTMLCanvasElement) { this._canvas = canvas; }

	private _glContext?: WebGLRenderingContext;
	private get gl() { if (!this._glContext) { throw new Error('no glContext'); } return this._glContext; }
	private set gl(context: WebGLRenderingContext) { this._glContext = context; }

	private renderingActive = true;

	constructor(
		private stl: StlService
	) { (window as any).appComponent = this; }

	public ngOnInit() {
		if (!this.canvasRef) { throw new Error('canvasRef not accessible'); }
		this.canvas = this.canvasRef.nativeElement;
		const glContext = this.canvas.getContext('webgl');
		if (!glContext) { throw new Error('couldn\'t create gl context'); }
		this.gl = glContext;

		document.addEventListener('keydown', evt => {
			if (evt.key === ' ') {
				this.renderingActive = !this.renderingActive;
			}
		});

		this.setupGl();
	}

	private setupGl() {
		const core = new GlCore(this.gl);
		const modelRenderer = new ModelRenderer();
		modelRenderer.setClearColor(vec3.fromValues(0, 0, 1));
		modelRenderer.setupModule(core);

		const refreshFrequency = 40;
		const roundTime = 6000;
		this.stl.loadModel('/assets/models/Rook_Dratini.stl').pipe(
			map(vd => modelRenderer.createModel(vd)),
			tap(modelID => modelRenderer.createInstance(modelID, mat4.create())),
			flatMap(() => interval(refreshFrequency).pipe(startWith(-1))),
			filter(() => this.renderingActive),
			tap((i: number) => {
				const percent = ((refreshFrequency * (i + 1)) / roundTime) % 1;

				// setup viewProjection
				const view = mat4.create();
				const eye = vec3.fromValues(0, -450, 100);
				const center = vec3.fromValues(0, 0, 0);
				const up = vec3.fromValues(0, 0, 1);
				rotate(eye, eye, up, 3.141592 * 2 * percent);
				mat4.lookAt(view, eye, center, up);

				const projection = mat4.create();
				mat4.perspective(projection, 45 * (3.141592 / 180), this.gl.drawingBufferWidth / this.gl.drawingBufferHeight, 0.1, 800.0);

				const viewProjection = mat4.create();
				mat4.multiply(viewProjection, projection, view);

				modelRenderer.setViewProjection(viewProjection);
				core.setResolutionToDisplayResolution();
				modelRenderer.nextFrame();
			})
		).subscribe();
	}

	private resize(canvas: HTMLCanvasElement) {
		const displayWidth = Math.floor(canvas.clientWidth * devicePixelRatio);
		const displayHeight = Math.floor(canvas.clientHeight * devicePixelRatio);
		if (canvas.width !== displayWidth) { canvas.width = displayWidth; }
		if (canvas.height !== displayHeight) { canvas.height = displayHeight; }
	}
}
