import { mat4, vec3 } from 'gl-matrix';
import { forkJoin, interval, map, mergeMap, startWith, tap } from 'rxjs';
import { CharacterPosition } from './HelperClasses/CharacterPosition';
import { ModelManager } from './HelperClasses/ModelManager';
import { WebGlFacade } from './HelperClasses/WebGlFacade';
import { CameraManager } from './HelperClasses/CameraManager';
import { LightingManager } from './HelperClasses/LightingManager';
import { IMaterial } from './ModelLoader/ModelLoader.types';

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
canvas.setAttribute('style', 'width: 100%; height: 100%;')
const webGlContext = canvas.getContext('webgl') as WebGLRenderingContext;

const gl = new WebGlFacade(webGlContext);
const modelManager = new ModelManager();
const cameraManager = new CameraManager(canvas);
const lightingManager = new LightingManager();
gl.enable(WebGLRenderingContext.DEPTH_TEST);
const buffer = gl.createBuffer();

lightingManager.setAmbientLight(vec3.fromValues(0.3, 0.3, 0.3));
lightingManager.createDirectedLightSource({
	from: vec3.fromValues(0.0, 1.0, 0.7),
	to: vec3.create(),
	color: vec3.fromValues(0.3, 0.3, 0.6)
});

const char = new CharacterPosition(canvas);
char.setPosition(vec3.fromValues(0, 50, 80));
char.setDirection(vec3.fromValues(0, -50, -80));
char.setup();

const refreshFrequency = 40;
const roundTime = 6000;

forkJoin([
	forkJoin([
		gl.loadShader(WebGLRenderingContext.VERTEX_SHADER, 'assets/shaders/main.vert'),
		gl.loadShader(WebGLRenderingContext.FRAGMENT_SHADER, 'assets/shaders/main.frag')
	]).pipe(map(([vertShader, fragShader]) => gl.createProgram(vertShader, fragShader))),
	modelManager.loadModel('/assets/models/eyeball/eyeball.obj')
]).pipe(
	tap(([_, modelID]) => {
		// const modelID = modelRenderer.createModel(m);
		const m = modelManager.getModel(modelID);
		const mat = m.materials.get('Eye_Tranz.001') as IMaterial;
		mat.ambient = vec3.fromValues(0.0, 0.0, 0.0);
		mat.diffuse = vec3.fromValues(0.0, 0.0, 0.0);

		const modelMatrix = mat4.create();
		// left-facing to front-facing
		mat4.rotateY(modelMatrix, modelMatrix, -3.141592 / 2);
		// z-up to y-up
		mat4.rotateX(modelMatrix, modelMatrix, -3.141592 / 2);
		// center model
		mat4.translate(modelMatrix, modelMatrix, [-(m.X.max + m.X.min) / 2, -(m.Y.max + m.Y.min) / 2, -(m.Z.max + m.Z.min) / 2]);
		// modelRenderer.createInstance(modelID, modelMatrix);
		modelManager.instantiate(gl, modelID, modelMatrix);

		const modelMatrix2 = mat4.create();
		// move to the right
		mat4.translate(modelMatrix2, modelMatrix2, [20, 0, 0]);
		// left-facing to front-facing
		mat4.rotateY(modelMatrix2, modelMatrix2, -3.141592 / 2);
		// z-up to y-up
		mat4.rotateX(modelMatrix2, modelMatrix2, -3.141592 / 2);
		// center model
		mat4.translate(modelMatrix2, modelMatrix2, [-(m.X.max + m.X.min) / 2, -(m.Y.max + m.Y.min) / 2, -(m.Z.max + m.Z.min) / 2]);
		// modelRenderer.createInstance(modelID, modelMatrix2);
		modelManager.instantiate(gl, modelID, modelMatrix2);
	}),
	mergeMap(([program]) => interval(refreshFrequency).pipe(startWith(-1)).pipe(
		tap((i: number) => {
			const percent = ((refreshFrequency * (i + 1)) / roundTime) % 1;
	
			gl.setResolutionToDisplayResolution();
			gl.clearViewport(vec3.fromValues(0.0, 0.0, 0.0));

			cameraManager.setPosition(char.getPosition());
			cameraManager.setDirection(char.getDirection());
	
			cameraManager.nextFrame(gl, program);
			lightingManager.nextFrame(gl, program);
			modelManager.nextFrame(gl, program, buffer);
		})
	))
).subscribe();
