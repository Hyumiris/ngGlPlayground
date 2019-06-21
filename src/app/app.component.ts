import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { VOID_VERTEX_SHADER } from './shaders/void.vert';
import { RAINBOW_FRAGMENT_SHADER } from './shaders/rainbow.frag';

@Component({
	selector: 'glp-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss'],
	host: {
		class: 'size-100'
	}
})
export class AppComponent implements OnInit {
	@ViewChild('canvas') private canvasRef?: ElementRef<HTMLCanvasElement>;

	private _canvas?: HTMLCanvasElement;
	private get canvas() { if (!this._canvas) { throw new Error('no glContext'); } return this._canvas; }
	private set canvas(canvas: HTMLCanvasElement) { this._canvas = canvas; }

	private _glContext?: WebGLRenderingContext;
	private get glContext() { if (!this._glContext) { throw new Error('no glContext'); } return this._glContext; }
	private set glContext(context: WebGLRenderingContext) { this._glContext = context; }

	constructor() { }

	public ngOnInit() {
		if (!this.canvasRef) { throw new Error('canvasRef not accessible'); }
		this.canvas = this.canvasRef.nativeElement;
		const glContext = this.canvas.getContext('webgl');
		if (!glContext) { throw new Error('couldn\'t create gl context'); }
		this.glContext = glContext;

		this.setupGl();
	}

	private setupGl() {
		// create vertex shader
		const vertShader = this.glContext.createShader(this.glContext.VERTEX_SHADER);
		if (!vertShader) { throw new Error('failed to create the vertex shader'); }
		this.glContext.shaderSource(vertShader, VOID_VERTEX_SHADER);
		this.glContext.compileShader(vertShader);

		// create fragment shader
		const fragShader = this.glContext.createShader(this.glContext.FRAGMENT_SHADER);
		if (!fragShader) { throw new Error('failed to create the vertex shader'); }
		this.glContext.shaderSource(fragShader, RAINBOW_FRAGMENT_SHADER);
		this.glContext.compileShader(fragShader);

		// check whether they compiled successfully
		if (!this.glContext.getShaderParameter(vertShader, this.glContext.COMPILE_STATUS)) {
			const failInfo = this.glContext.getShaderInfoLog(vertShader);
			throw new Error('Could not compile WebGL program:\n\n' + failInfo);
		}
		if (!this.glContext.getShaderParameter(fragShader, this.glContext.COMPILE_STATUS)) {
			const failInfo = this.glContext.getShaderInfoLog(fragShader);
			throw new Error('Could not compile WebGL program:\n\n' + failInfo);
		}

		// create program
		const program = this.glContext.createProgram();
		if (!program) { throw new Error('failed to create the gl program'); }
		this.glContext.attachShader(program, vertShader);
		this.glContext.attachShader(program, fragShader);
		this.glContext.linkProgram(program);

		if (!this.glContext.getProgramParameter(program, this.glContext.LINK_STATUS)) {
			const failInfo = this.glContext.getProgramInfoLog(program);
			throw new Error('Could not compile WebGL program:\n\n' + failInfo);
		}

		// use program
		this.glContext.useProgram(program);

		// create buffer
		const vertexArray = new Float32Array([
			1.0, 1.0, 1.0, 1.0,
			-1.0, 1.0, 1.0, 1.2,
			1.0, -1.0, 1.0, 1.2,
			-1.0, -1.0, 0.0, 1.0,
			-0.0, -1.0, 0.0, 1.0,
			-1.0, -0.0, 0.0, 1.0
		]);
		const vertexBuffer = this.glContext.createBuffer();
		if (!vertexBuffer) { throw new Error('couldn\'t create buffer object'); }
		this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, vertexBuffer);
		this.glContext.bufferData(this.glContext.ARRAY_BUFFER, vertexArray, this.glContext.STATIC_DRAW);

		// --- begin drawing

		this.resize(this.glContext.canvas);
		this.glContext.viewport(0, 0, this.glContext.drawingBufferWidth, this.glContext.drawingBufferHeight);
		this.glContext.clearColor(0.8, 0.9, 1.0, 1.0);
		this.glContext.clear(this.glContext.COLOR_BUFFER_BIT);

		// setup attributes
		const aPositionLocation = this.glContext.getAttribLocation(program, 'position');
		this.glContext.enableVertexAttribArray(aPositionLocation);
		this.glContext.vertexAttribPointer(aPositionLocation, 4, this.glContext.FLOAT, false, 0, 0);

		this.glContext.drawArrays(this.glContext.TRIANGLES, 0, 6);
	}

	private resize(canvas: HTMLCanvasElement) {
		const displayWidth = Math.floor(canvas.clientWidth * devicePixelRatio);
		const displayHeight = Math.floor(canvas.clientHeight * devicePixelRatio);
		if (canvas.width !== displayWidth) { canvas.width = displayWidth; }
		if (canvas.height !== displayHeight) { canvas.height = displayHeight; }
	}
}
