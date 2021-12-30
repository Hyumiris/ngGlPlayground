import { Observable } from 'rxjs';
import { toFloat32Array } from '../helper/glMatrixHelper';
import { IMaterial, IModelDataBase } from '../ModelLoader/ModelLoader.types';
import { InstanceDataBuffer } from './InstanceBuffer';
import { ModelInstance } from './ModelManager';
import { GLTextureID, WebGlFacade } from './WebGlFacade';

/**
 * A MaterialBuffer holds all the vertex data asssociated with a certain material
 * and aids with drawing said vertex data.
 */
export class MaterialBuffer {

	private instances = new InstanceDataBuffer();
	private colorTex?: WebGLTexture;
	private bumpTex?: WebGLTexture;

	constructor(private gl: WebGlFacade, private material: IMaterial) {
		if (material.color_map) {
			this.loadTexture(gl, material.color_map).subscribe(texture => this.colorTex = texture);
		}
		if (material.bump_map) {
			this.loadTexture(gl, material.bump_map).subscribe(texture => this.bumpTex = texture);
		}
	}

	addInstance(instance: ModelInstance, model: IModelDataBase) {
		this.instances.addInstance(instance, model);
	}

	removeInstance(instance: ModelInstance) {
		this.instances.removeInstance(instance);
	}

	setProperties(gl: WebGlFacade, program: WebGLProgram, buffer: WebGLBuffer | null, forceBufferWrite = false) {
		gl.setUniform(program, 'material_ambient', 3, this.material.ambient);
		gl.setUniform(program, 'material_diffuse', 3, this.material.diffuse);
		gl.setUniform(program, 'material_specular', 3, this.material.specular);
		// TODO: check if this works as intended even though it calls the float version
		gl.setUniform(program, 'material_specular_exp', 1, this.material.specular_exp);
		gl.setUniform(program, 'material_alpha', 1, this.material.opacity);
		gl.setUniform(program, 'material_illum', 1, this.material.illum);

		const { modelMatrices, normalMatrices } = this.instances.getMatrices();
		gl.setUniformMatrix(program, 'modelMatrices', 4, toFloat32Array(modelMatrices));
		gl.setUniformMatrix(program, 'normalMatrices', 4, toFloat32Array(normalMatrices));

		if (this.colorTex) {
			gl.setUniformTexture(program, 'color_map', this.colorTex, GLTextureID.TEXTURE0);
		}
		if (this.bumpTex) {
			gl.setUniformTexture(program, 'bump_map', this.bumpTex, GLTextureID.TEXTURE1);
		}

		// tslint:disable: max-line-length
		gl.bindBuffer(buffer);
		gl.setVertexAttribPointer(program, 'position', 3, 'FLOAT', false, InstanceDataBuffer.VERTEXDATALENGTH, 0);
		gl.setVertexAttribPointer(program, 'normal', 3, 'FLOAT', false, InstanceDataBuffer.VERTEXDATALENGTH, 3 * InstanceDataBuffer.SIZE_FLOAT);
		gl.setVertexAttribPointer(program, 'texCoords', 2, 'FLOAT', false, InstanceDataBuffer.VERTEXDATALENGTH, 6 * InstanceDataBuffer.SIZE_FLOAT);
		gl.setVertexAttribPointer(program, 'instanceIndex', 1, 'FLOAT', false, InstanceDataBuffer.VERTEXDATALENGTH, 8 * InstanceDataBuffer.SIZE_FLOAT);
		// tslint:enable: max-line-length

		this.instances.updateAttributeBuffer(gl, buffer, forceBufferWrite);
	}

	numVertices() {
		return this.instances.numVertices;
	}

	isTransparent() {
		return this.material.opacity < 1;
	}

	private loadTexture(gl: WebGlFacade, src: string) {
		return new Observable<WebGLTexture>(subscriber => {
			const texture = gl.createTexture();
			subscriber.next(texture);
			const image = new Image();
			image.onload = () => {
				gl.texImage2D(texture, image);
				subscriber.complete();
			};
			image.src = src;
		});
	}

}
