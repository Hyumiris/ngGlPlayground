import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { VOID_VERTEX_SHADER } from './shaders/void.vert';
import { RAINBOW_FRAGMENT_SHADER } from './shaders/rainbow.frag';
import { mat4, vec3, vec4 } from 'gl-matrix';
import { interval } from 'rxjs';
import { tap, startWith, map, flatMap, filter } from 'rxjs/operators';
import { StlService } from './services/stl.service';
import { SIZE_VERTEX_DATA, SIZE_FLOAT, IVertexData } from './types/types';
import { ModelRenderer } from './types/ModelRenderer';
import { concatenate, rotate } from './helper/glMatrixHelper';

//
// ts: [name: (number | string)]: any is not accepted even though number or string is allowed
//
// An index signature parameter type cannot be a type alias. Consider writing '[index: number]: IVertexData[]' instead.ts(1336)
//

Object.assign(window, {
	modelRenderer: new ModelRenderer(),
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
		// create vertex shader
		const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
		if (!vertShader) { throw new Error('failed to create the vertex shader'); }
		this.gl.shaderSource(vertShader, VOID_VERTEX_SHADER);
		this.gl.compileShader(vertShader);

		// create fragment shader
		const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
		if (!fragShader) { throw new Error('failed to create the vertex shader'); }
		this.gl.shaderSource(fragShader, RAINBOW_FRAGMENT_SHADER);
		this.gl.compileShader(fragShader);

		// check whether they compiled successfully
		if (!this.gl.getShaderParameter(vertShader, this.gl.COMPILE_STATUS)) {
			const failInfo = this.gl.getShaderInfoLog(vertShader);
			throw new Error('Could not compile WebGL program:\n\n' + failInfo);
		}
		if (!this.gl.getShaderParameter(fragShader, this.gl.COMPILE_STATUS)) {
			const failInfo = this.gl.getShaderInfoLog(fragShader);
			throw new Error('Could not compile WebGL program:\n\n' + failInfo);
		}

		// create program
		const program = this.gl.createProgram();
		if (!program) { throw new Error('failed to create the gl program'); }
		this.gl.attachShader(program, vertShader);
		this.gl.attachShader(program, fragShader);
		this.gl.linkProgram(program);

		if (!this.gl.getProgramParameter(program, WebGLRenderingContext.LINK_STATUS)) {
			const failInfo = this.gl.getProgramInfoLog(program);
			throw new Error('Could not compile WebGL program:\n\n' + failInfo);
		}

		// use program
		this.gl.useProgram(program);
		this.gl.enable(WebGLRenderingContext.DEPTH_TEST);

		// create buffer
		let vertexData: IVertexData[];
		let vertexArray: Float32Array;
		const vertexBuffer = this.gl.createBuffer();
		if (!vertexBuffer) { throw new Error('couldn\'t create buffer object'); }
		this.gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, vertexBuffer);

		const refreshFrequency = 40;
		const roundTime = 6000;
		this.stl.loadModel('/assets/models/Rook_Dratini.stl').pipe(
			tap(vd => vertexData = vd),
			map(() => vertexData.map(vd => concatenate(Float32Array, vd.position, vd.normal))),
			map(mappedData => concatenate(Float32Array, mappedData)),
			tap(concatenatedData => vertexArray = concatenatedData),
			tap(() => this.gl.bufferData(WebGLRenderingContext.ARRAY_BUFFER, vertexArray, WebGLRenderingContext.STATIC_DRAW)),
			flatMap(() => interval(refreshFrequency).pipe(startWith(-1))),
			filter(() => this.renderingActive),
			tap((i: number) => {
				const percent = ((refreshFrequency * (i + 1)) / roundTime) % 1;

				if (this.gl.canvas instanceof HTMLCanvasElement) { this.resize(this.gl.canvas); }
				this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
				this.gl.clearColor(0.8, 0.9, 1.0, 1.0);
				this.gl.clear(WebGLRenderingContext.COLOR_BUFFER_BIT);

				// setup attributes
				const aPositionLocation = this.gl.getAttribLocation(program, 'position');
				this.gl.enableVertexAttribArray(aPositionLocation);
				this.gl.vertexAttribPointer(aPositionLocation, 3, WebGLRenderingContext.FLOAT, false, SIZE_VERTEX_DATA, 0);

				const aNormalLocation = this.gl.getAttribLocation(program, 'normal');
				this.gl.enableVertexAttribArray(aNormalLocation);
				this.gl.vertexAttribPointer(aNormalLocation, 3, WebGLRenderingContext.FLOAT, false, SIZE_VERTEX_DATA, 3 * SIZE_FLOAT);

				// setup uniforms
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

				const viewProjectionLocation = this.gl.getUniformLocation(program, 'view_projection');
				this.gl.uniformMatrix4fv(viewProjectionLocation, false, viewProjection);

				// draw
				this.gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, vertexData.length);
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
