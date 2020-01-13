import { vec3 } from 'gl-matrix';
import { TypedArray } from './types';

export type ShaderName = string | number;
export type ProgramName = string | number;

export class GlCore {

	private gl: WebGLRenderingContext;
	private shaders: { [name: string]: WebGLShader; } = {};
	private programs: { [name: string]: WebGLProgram } = {};

	constructor(gl: WebGLRenderingContext) {
		this.gl = gl;
	}

	private rawGL() { return this.gl; }

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
	 * @param offset offset in byte
	 */
	// tslint:disable-next-line:max-line-length
	public setVertexAttribPointer(program: ProgramName, attributeName: string, size: number, type: number, normalized: boolean, stride: number, offset: number) {
		const aLocation = this.gl.getAttribLocation(this.programs[program], attributeName);
		this.gl.enableVertexAttribArray(aLocation);
		this.gl.vertexAttribPointer(aLocation, size, type, normalized, stride, offset);
	}

	public setUniform(program: ProgramName, uniform: string, num: 1 | 2 | 3 | 4, value: Float32Array | Int32Array | number, ..._: number[]) {
		if (!this.programs[program]) { throw new Error(`Program ${program} does not exist`); }
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

	public setUniformMatrix(program: ProgramName, uniform: string, num: 2 | 3 | 4, values: Float32Array) {
		if (!this.programs[program]) { throw new Error(`Program ${program} does not exist`); }
		const uniformLocation = this.gl.getUniformLocation(this.programs[program], uniform);

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

	public setBufferDataStaticDraw(data: TypedArray) {
		this.gl.bufferData(WebGLRenderingContext.ARRAY_BUFFER, data, WebGLRenderingContext.STATIC_DRAW);
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