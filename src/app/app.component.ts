import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { mat4, vec3 } from 'gl-matrix';
import { interval } from 'rxjs';
import { tap, startWith, map, flatMap, filter } from 'rxjs/operators';
import { StlService } from './services/stl.service';
import { ModelRenderer } from './GlModules/ModelRenderer';
import { CameraModule } from './GlModules/CameraModule';
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
		core.setClearColor(vec3.fromValues(0.3, 0.3, .4));
		const modelRenderer = new ModelRenderer();
		const cameraModule = new CameraModule();
		core.registerModule(cameraModule);
		core.registerModule(modelRenderer);

		const refreshFrequency = 40;
		const roundTime = 6000;
		this.stl.loadModel('/assets/models/Rook_Dratini.stl').pipe(
			tap(m => {
				const modelID = modelRenderer.createModel(m);

				const modelMatrix = mat4.create();
				// left-facing to front-facing
				mat4.rotateY(modelMatrix, modelMatrix, -3.141592 / 2);
				// z-up to y-up
				mat4.rotateX(modelMatrix, modelMatrix, -3.141592 / 2);
				// center model
				mat4.translate(modelMatrix, modelMatrix, [-(m.X.max + m.X.min) / 2, -(m.Y.max + m.Y.min) / 2, -(m.Z.max + m.Z.min) / 2, 0]);
				modelRenderer.createInstance(modelID, modelMatrix);

				const modelMatrix2 = mat4.create();
				// move to the right
				mat4.translate(modelMatrix2, modelMatrix2, [20, 0, 0]);
				// left-facing to front-facing
				mat4.rotateY(modelMatrix2, modelMatrix2, -3.141592 / 2);
				// z-up to y-up
				mat4.rotateX(modelMatrix2, modelMatrix2, -3.141592 / 2);
				// center model
				mat4.translate(modelMatrix2, modelMatrix2, [-(m.X.max + m.X.min) / 2, -(m.Y.max + m.Y.min) / 2, -(m.Z.max + m.Z.min) / 2, 0]);
				modelRenderer.createInstance(modelID, modelMatrix2);
			}),
			flatMap(() => interval(refreshFrequency).pipe(startWith(-1))),
			filter(() => this.renderingActive),
			tap((i: number) => {
				const percent = ((refreshFrequency * (i + 1)) / roundTime) % 1;

				const eye = vec3.fromValues(0, 150, 400);
				// change height
				vec3.add(eye, eye, [0, Math.sin(percent * 3.141592 * 4) * eye[1] * 0.4, 0]);
				// rotate around center
				rotate(eye, eye, vec3.fromValues(0, 1, 0), 3.141592 * 2 * percent);
				cameraModule.setPosition(eye);
				cameraModule.setDirection(vec3.scale(vec3.create(), eye, -1));

				core.setResolutionToDisplayResolution();
				core.nextFrame();
			})
		).subscribe();
	}
}
