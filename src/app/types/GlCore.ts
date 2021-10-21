import { vec3 } from 'gl-matrix';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GlModule } from '../GlModules/GlModule';
import { loadTextFile } from '../helper/fileLoader';
import { TypedArray } from './types';

export type ShaderName = string | number;
export type ProgramName = string | number;

/** possible values:\
 * BYTE\
 * SHORT\
 * UNSIGNED_BYTE\
 * UNSIGNED_SHORT\
 * FLOAT
 */
// tslint:disable-next-line:max-line-length
export type GLDataType = WebGLRenderingContext['BYTE'] | WebGLRenderingContext['SHORT'] | WebGLRenderingContext['UNSIGNED_BYTE'] | WebGLRenderingContext['UNSIGNED_SHORT'] | WebGLRenderingContext['FLOAT'];

export class GlCore {

	private gl: WebGLRenderingContext;
	private shaders: { [name: string]: WebGLShader; } = {};
	private programs: { [name: string]: WebGLProgram } = {};
	private modules: GlModule[] = [];
	private clearColor?: vec3;

	constructor(gl: WebGLRenderingContext) {
		this.gl = gl;
	}

	public init() {
		return forkJoin([
			this.loadShader('mainVertexShader', WebGLRenderingContext.VERTEX_SHADER, 'assets/shaders/modelRenderer.vert'),
			this.loadShader('mainFragmentShader', WebGLRenderingContext.FRAGMENT_SHADER, 'assets/shaders/modelRenderer.frag')
		]).pipe(
			map(() => this.createProgram('mainProgram', 'mainVertexShader', 'mainFragmentShader'))
		);
	}

	public registerModule(module: GlModule) {
		module.setupModule(this);
		this.modules.push(module);
	}

	public nextFrame() {
		this.setResolutionToDisplayResolution();
		if (this.clearColor) { this.clearViewport(this.clearColor); }
		this.modules.forEach(module => module.nextFrame());
	}

	/**
	 * very powerful requesting mechanism to read directly from another module
	 * TODO: better, encapsulating-friendly method
	 */
	public request(source: typeof GlModule, value: string) {
		return ((this.modules.find((module) => (module instanceof source))) as unknown as { [v: string]: unknown })[value];
	}

	public getCanvasWidth() {
		return this.gl.canvas.width;
	}

	public getCanvasHeight() {
		return this.gl.canvas.height;
	}

	public createShader(name: ShaderName, shaderType: number, code: string) {
		if (name in this.shaders) { throw new Error(`shader with name '${name}' does already exist`); }
		if (shaderType !== this.gl.VERTEX_SHADER && shaderType !== this.gl.FRAGMENT_SHADER) {
			throw new Error(
				`shaderType ${shaderType} is neither a vertexShader (${this.gl.VERTEX_SHADER}) or a fragmentShader (${this.gl.FRAGMENT_SHADER})`);
		}

		const newShader = this.gl.createShader(shaderType);
		if (!newShader) { throw new Error('failed to create the shader'); }
		this.gl.shaderSource(newShader, code);
		this.gl.compileShader(newShader);
		if (!this.gl.getShaderParameter(newShader, this.gl.COMPILE_STATUS)) {
			const failInfo = this.gl.getShaderInfoLog(newShader);
			throw new Error('Could not compile WebGL program:\n\n' + failInfo);
		}

		this.shaders[name] = newShader;
	}

	public loadShader(name: ShaderName, shaderType: number, path: string) {
		return loadTextFile(path).pipe(map(code => this.createShader(name, shaderType, code)));
	}

	public createProgram(name: ProgramName, vertShader: ShaderName, fragShader: ShaderName) {
		if (name in this.programs) { throw new Error(`program with name '${name}' does already exist`); }
		if (!(vertShader in this.shaders)) { throw new Error(`shader with name '${vertShader}' doesn't exist`); }
		if (!(fragShader in this.shaders)) { throw new Error(`shader with name '${fragShader}' doesn't exist`); }

		const program = this.gl.createProgram();
		if (!program) { throw new Error('failed to create the program'); }
		this.gl.attachShader(program, this.shaders[vertShader]);
		this.gl.attachShader(program, this.shaders[fragShader]);
		this.gl.linkProgram(program);

		if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
			const failInfo = this.gl.getProgramInfoLog(program);
			throw new Error('Could not compile WebGL program:\n\n' + failInfo);
		}

		this.programs[name] = program;
	}

	/**
	 * sets the passed flags for the rendering context
	 * @param flags flags that should be enabled
	 */
	public enable(flags: number) {
		this.gl.enable(flags);
	}

	/**
	 * chooses the program used for draw calls
	 * @param name name of the program or null to deselect all programs
	 */
	public useProgram(name: ProgramName | null) {
		this.gl.useProgram((name !== null) ? this.programs[name] : name);
	}

	/**
	 * loads data for vertex attribute from a buffer
	 * @param program name of the program for which to set the vertex attribute pointer
	 * @param attributeName name of the attribute
	 * @param size amount of components of this attribute
	 * @param type data type of the component(s)
	 * @param normalized if true BYTE and SHORT get normalized to [-1; 1] and UNSIGNED_BYTE and UNSIGNED_SHORT get normalized to [0; 1]
	 * @param stride size of one block of date for a single vertex in bytes, 0 means this attribute is tightly packed
	 * @param offset offset in bytes from the start of the vertex data block
	 */
	// tslint:disable-next-line:max-line-length
	public setVertexAttribPointer(program: ProgramName, attributeName: string, size: number, type: GLDataType, normalized: boolean, stride: number, offset: number) {
		const aLocation = this.gl.getAttribLocation(this.programs[program], attributeName);
		this.gl.enableVertexAttribArray(aLocation);
		this.gl.vertexAttribPointer(aLocation, size, type, normalized, stride, offset);
	}

	/**
	 * @param program name of the program for which to set the uniform
	 * @param uniform name of the uniform
	 * @param num number of components that each value consists of
	 * @param value the actual value(s) to be assigned to the uniform
	 */
	public setUniform(program: ProgramName, uniform: string, num: 1 | 2 | 3 | 4, value: Float32Array | Int32Array | number, ..._: number[]) {
		if (!this.programs[program]) { throw new Error(`Program ${program} does not exist`); }
		this.useProgram(program);
		const uniformLocation = this.gl.getUniformLocation(this.programs[program], uniform);
		if (value instanceof Float32Array) {
			// this.gl[`uniform${num}fv`](uniformLocation, value);
			switch (num) {
				case 1: this.gl.uniform1fv(uniformLocation, value); break;
				case 2: this.gl.uniform2fv(uniformLocation, value); break;
				case 3: this.gl.uniform3fv(uniformLocation, value); break;
				case 4: this.gl.uniform4fv(uniformLocation, value); break;
			}
		} else if (value instanceof Int32Array) {
			// this.gl[`uniform${num}iv`](uniformLocation, value);
			switch (num) {
				case 1: this.gl.uniform1iv(uniformLocation, value); break;
				case 2: this.gl.uniform2iv(uniformLocation, value); break;
				case 3: this.gl.uniform3iv(uniformLocation, value); break;
				case 4: this.gl.uniform4iv(uniformLocation, value); break;
			}
		} else {
			// this.gl[`uniform${num}f`](uniformLocation, ...Array.prototype.slice.call(arguments, 3, 3 + num));
			const numbers: number[] = Array.prototype.slice.call(arguments, 3, 3 + num);
			switch (num) {
				case 1: this.gl.uniform1f(uniformLocation, numbers[0]); break;
				case 1: this.gl.uniform2f(uniformLocation, numbers[0], numbers[1]); break;
				case 1: this.gl.uniform3f(uniformLocation, numbers[0], numbers[1], numbers[2]); break;
				case 1: this.gl.uniform4f(uniformLocation, numbers[0], numbers[1], numbers[2], numbers[3]); break;
			}
		}
	}

	/**
	 * @param program name of the program for which to set the uniform
	 * @param uniform name of the matrix uniform
	 * @param num num x num is the size of the unifom matrix
	 * @param values the actual values to be assigned to the uniform
	 */
	public setUniformMatrix(program: ProgramName, uniform: string, num: 2 | 3 | 4, values: Float32Array) {
		if (!this.programs[program]) { throw new Error(`Program ${program} does not exist`); }
		this.useProgram(program);
		const uniformLocation = this.gl.getUniformLocation(this.programs[program], uniform);

		// second param must be false according to docs
		// this.gl[`uniformMatrix${num}fv`](uniformLocation, false, values);
		switch (num) {
			case 2: this.gl.uniformMatrix2fv(uniformLocation, false, values); break;
			case 3: this.gl.uniformMatrix3fv(uniformLocation, false, values); break;
			case 4: this.gl.uniformMatrix4fv(uniformLocation, false, values); break;
		}
	}

	/**
	 * sets the output resolution to match the devices display capabilities for the current area covered by the canvas
	 */
	public setResolutionToDisplayResolution() {
		if (!(this.gl.canvas instanceof HTMLCanvasElement)) {
			throw new Error('can\'t resize resolution to the dimensions of an offscreen canvas as it does not have dimensions');
		}
		const displayWidth = Math.floor(this.gl.canvas.clientWidth * devicePixelRatio);
		const displayHeight = Math.floor(this.gl.canvas.clientHeight * devicePixelRatio);
		if (this.gl.canvas.width !== displayWidth) { this.gl.canvas.width = displayWidth; }
		if (this.gl.canvas.height !== displayHeight) { this.gl.canvas.height = displayHeight; }
	}

	public clearViewport(color: vec3 = vec3.fromValues(1.0, 1.0, 1.0)) {
		this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
		this.gl.clearColor(color[0], color[1], color[2], 1.0);
		this.gl.clear(WebGLRenderingContext.COLOR_BUFFER_BIT);
	}

	public createBuffer() {
		const buffer = this.gl.createBuffer();
		if (!buffer) { throw new Error('failed to create buffer'); }
		return buffer;
	}

	public bindBuffer(buffer: WebGLBuffer) {
		this.gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, buffer);
	}

	public setBufferDataStaticDraw(data: TypedArray) {
		this.gl.bufferData(WebGLRenderingContext.ARRAY_BUFFER, data, WebGLRenderingContext.STATIC_DRAW);
	}

	public setClearColor(clearColor?: vec3) {
		this.clearColor = clearColor;
	}

	/**
	 * draw call
	 * @param mode what kind of primitives
	 * @param start first index of the vertices
	 * @param end last index of the vertices
	 */
	public drawArrays(mode: number, start: number, end: number) {
		this.gl.drawArrays(mode, start, end);
	}

}
