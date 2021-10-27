import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { mat4, vec3 } from 'gl-matrix';
import { interval } from 'rxjs';
import { tap, startWith, flatMap, filter, mergeMap } from 'rxjs/operators';
import { ModelRenderer } from './GlModules/ModelRenderer';
import { CameraModule } from './GlModules/CameraModule';
import { LightingModule } from './GlModules/LightingModule';
import { GlCore } from './types/GlCore';
import { CharacterPosition } from './HelperClasses/CharacterPosition';
import { createCuboid } from './helper/glMatrixHelper';
import { loadObjModel } from './ModelLoader/obj.loader';

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

	constructor() { (window as any).appComponent = this; }

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
		const cameraModule = new CameraModule();
		const lightingModule = new LightingModule();

		lightingModule.setAmbientLight(vec3.fromValues(0.4, 0.4, 0.4));
		lightingModule.createDirectedLightSource({
			from: vec3.fromValues(0.4, 1.0, 0.0),
			to: vec3.create(),
			color: vec3.fromValues(0.5, 0.0, 0.5)
		});

		const char = new CharacterPosition(this.canvas);
		char.setPosition(vec3.fromValues(0, 150, 400));
		char.setDirection(vec3.fromValues(0, -150, -400));
		char.setup();

		const charLightColor = vec3.fromValues(0.4, 0.4, 0.4);
		const charLight = lightingModule.createDirectedLightSource({ direction: char.getDirection(), color: charLightColor });

		const refreshFrequency = 40;
		const roundTime = 6000;


		core.init().pipe(
			tap(() => {
				core.setClearColor(vec3.fromValues(0.3, 0.3, 0.4));
				core.registerModule(lightingModule);
				core.registerModule(cameraModule);
				core.registerModule(modelRenderer);
			}),
			tap(() => {
				const box = createCuboid(-400, 400, -400, 400, -400, 400);
				const boxID = modelRenderer.createModel({
					position: box,
					normal: box.map(() => vec3.fromValues(Math.random(), Math.random(), Math.random())),
					X: { min: -400, max: 400 },
					Y: { min: -400, max: 400 },
					Z: { min: -400, max: 400 },
				});
				modelRenderer.createInstance(boxID);
			}),
			mergeMap(() => loadObjModel('/assets/models/eyeball/eyeball.obj')),
			// mergeMap(() => this.stl.loadModel('/assets/models/Rook_Dratini.stl')),
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

				cameraModule.setPosition(char.getPosition());
				cameraModule.setDirection(char.getDirection());
				lightingModule.updateDirectedLightSource(charLight, { direction: char.getDirection(), color: charLightColor });

				core.nextFrame();
			})
		).subscribe();
	}
}
