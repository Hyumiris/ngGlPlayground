import { vec3 } from 'gl-matrix';
import { map } from 'rxjs';
import { loadTextFile } from '../helper/fileLoader';
import { TypedArray } from '../types/types';

export type GLDataType = 'BYTE' | 'SHORT' | 'UNSIGNED_BYTE' | 'UNSIGNED_SHORT' | 'FLOAT';
export enum GLTextureID {
	TEXTURE0,
	TEXTURE1,
	TEXTURE2,
	TEXTURE3
}

export class WebGlFacade {

	private gl: WebGLRenderingContext;

	constructor(gl: WebGLRenderingContext) {
		this.gl = gl;
	}

	public getCanvasWidth() {
		return this.gl.canvas.width;
	}

	public getCanvasHeight() {
		return this.gl.canvas.height;
	}

	public createShader(shaderType: number, code: string) {
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

		return newShader;
	}

	public loadShader(shaderType: number, path: string) {
		return loadTextFile(path).pipe(map(code => this.createShader(shaderType, code)));
	}

	public createProgram(vertShader: WebGLShader, fragShader: WebGLShader) {
		const program = this.gl.createProgram();
		if (!program) { throw new Error('failed to create the program'); }
		this.gl.attachShader(program, vertShader);
		this.gl.attachShader(program, fragShader);
		this.gl.linkProgram(program);

		if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
			const failInfo = this.gl.getProgramInfoLog(program);
			throw new Error('Could not compile WebGL program:\n\n' + failInfo);
		}

		return program;
	}

	/**
	 * sets the passed flags for the rendering context
	 * @param flags flags that should be enabled
	 */
	public enable(flags: number) {
		this.gl.enable(flags);
	}

	/**
	 * unsets the passed flags for the rendering context
	 * @param flags flags that should be enabled
	 */
	public disable(flags: number) {
		this.gl.disable(flags);
	}

	public enableAlphaBlending() {
		this.gl.depthMask(false);
		this.gl.enable(this.gl.BLEND)
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
	}

	public disableAlphaBlending() {
		this.gl.depthMask(true);
		this.gl.disable(this.gl.BLEND)
	}

	/**
	 * chooses the program used for draw calls
	 * @param name name of the program or null to deselect all programs
	 */
	public useProgram(program: WebGLProgram | null) {
		this.gl.useProgram(program);
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
	public setVertexAttribPointer(program: WebGLProgram, attributeName: string, size: number, type: GLDataType, normalized: boolean, stride: number, offset: number) {
		const aLocation = this.gl.getAttribLocation(program, attributeName);
		this.gl.enableVertexAttribArray(aLocation);
		this.gl.vertexAttribPointer(aLocation, size, WebGLRenderingContext[type], normalized, stride, offset);
	}

	/**
	 * @param program name of the program for which to set the uniform
	 * @param uniform name of the uniform
	 * @param num number of components that each value consists of
	 * @param value the actual value(s) to be assigned to the uniform
	 */
	public setUniform(program: WebGLProgram, uniform: string, num: 1 | 2 | 3 | 4, value: Float32Array | Int32Array | number, ..._: number[]) {
		this.useProgram(program);
		const uniformLocation = this.gl.getUniformLocation(program, uniform);
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
				case 2: this.gl.uniform2f(uniformLocation, numbers[0], numbers[1]); break;
				case 3: this.gl.uniform3f(uniformLocation, numbers[0], numbers[1], numbers[2]); break;
				case 4: this.gl.uniform4f(uniformLocation, numbers[0], numbers[1], numbers[2], numbers[3]); break;
			}
		}
	}

	/**
	 * @param program name of the program for which to set the uniform
	 * @param uniform name of the matrix uniform
	 * @param num num x num is the size of the unifom matrix
	 * @param values the actual values to be assigned to the uniform
	 */
	public setUniformMatrix(program: WebGLProgram, uniform: string, num: 2 | 3 | 4, values: Float32Array) {
		this.useProgram(program);
		const uniformLocation = this.gl.getUniformLocation(program, uniform);

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

	public bindBuffer(buffer: WebGLBuffer | null) {
		this.gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, buffer);
	}

	public setBufferDataStaticDraw(data: TypedArray) {
		this.gl.bufferData(WebGLRenderingContext.ARRAY_BUFFER, data, WebGLRenderingContext.STATIC_DRAW);
	}

	public createTexture() {
		const texture = this.gl.createTexture();
		if (!texture) { throw new Error('failed to create texture'); }
		this.gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, texture);
		const defaultData = new Uint8Array([0, 0, 255, 255]);
		this.gl.texImage2D(
			WebGLRenderingContext.TEXTURE_2D,
			0,
			WebGLRenderingContext.RGBA,
			1,
			1,
			0,
			WebGLRenderingContext.RGBA,
			WebGLRenderingContext.UNSIGNED_BYTE,
			defaultData
		);
		return texture;
	}

	public bindTexture(texture: WebGLTexture) {
		this.gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, texture);
	}

	public setUniformTexture(program: WebGLProgram, uniform: string, texture: WebGLTexture, textureID: GLTextureID) {
		const textureUnit = GLTextureID[textureID] as keyof typeof GLTextureID;
		this.gl.useProgram(program);
		const uniformLocation = this.gl.getUniformLocation(program, uniform);
		this.gl.activeTexture(WebGLRenderingContext[textureUnit]);
		this.gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, texture);
		this.gl.uniform1i(uniformLocation, textureID);
	}

	public texImage2D(texture: WebGLTexture, image: TexImageSource) {
		this.gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, texture);
		this.gl.texImage2D(
			WebGLRenderingContext.TEXTURE_2D,
			0,
			WebGLRenderingContext.RGBA,
			WebGLRenderingContext.RGBA,
			WebGLRenderingContext.UNSIGNED_BYTE,
			image
		);
		
		this.gl.texParameteri(WebGLRenderingContext.TEXTURE_2D, WebGLRenderingContext.TEXTURE_WRAP_S, WebGLRenderingContext.CLAMP_TO_EDGE);
		this.gl.texParameteri(WebGLRenderingContext.TEXTURE_2D, WebGLRenderingContext.TEXTURE_WRAP_T, WebGLRenderingContext.CLAMP_TO_EDGE);
		this.gl.texParameteri(WebGLRenderingContext.TEXTURE_2D, WebGLRenderingContext.TEXTURE_MIN_FILTER, WebGLRenderingContext.LINEAR);
	}

	/**
	 * draw call for a given range of vertices
	 * @param mode what kind of primitives
	 * @param start first index of the vertices
	 * @param end last index of the vertices
	 */
	public drawArrays(mode: number, start: number, end: number) {
		this.gl.drawArrays(mode, start, end);
	}

}
