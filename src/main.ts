import { mat4, vec3 } from 'gl-matrix';
import { forkJoin, interval, map, mergeMap, startWith, tap } from 'rxjs';
import { CharacterPosition } from './HelperClasses/CharacterPosition';
import { ModelManager } from './HelperClasses/ModelManager';
import { WebGlFacade } from './HelperClasses/WebGlFacade';
import { CameraManager } from './HelperClasses/CameraManager';
import { LightingManager } from './HelperClasses/LightingManager';


const fpsSpan = document.createElement('span');
document.body.appendChild(fpsSpan);
fpsSpan.style.position = 'fixed';
fpsSpan.style.top = '0';
fpsSpan.style.right = '0';
fpsSpan.style.color = 'white';
fpsSpan.style.textAnchor = 'end';
let renderCounter = 0;
let fps = 0;
interval(500).subscribe(() => {
	fps = (fps + renderCounter) * (2 / 3);
	fpsSpan.innerText = `FPS: ${fps.toFixed(2)}`;
	renderCounter = 0;
});

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

lightingManager.setAmbientLight(vec3.fromValues(0.5, 0.5, 0.5));
lightingManager.createDirectedLightSource({
	direction: vec3.fromValues(0, -50, -80),
	color: vec3.fromValues(0.4, 0.4, 0.5)
});

const char = new CharacterPosition(canvas);
char.setPosition(vec3.fromValues(0, 50, 80));
char.setDirection(vec3.fromValues(0, -50, -80));
char.setup();

const refreshFrequency = 60;
const roundTime = 6000;

forkJoin([
	forkJoin([
		gl.loadShader(WebGLRenderingContext.VERTEX_SHADER, 'assets/shaders/main.vert'),
		gl.loadShader(WebGLRenderingContext.FRAGMENT_SHADER, 'assets/shaders/main.frag')
	]).pipe(map(([vertShader, fragShader]) => gl.createProgram(vertShader, fragShader))),
	modelManager.loadModel('models/terrain/modular_terrain_collections/Modular Terrain Hilly/Prop_Bridge_Log_End_Edge.obj')
]).pipe(
	tap(([_, modelID]) => {
		// const modelID = modelRenderer.createModel(m);
		const m = modelManager.getModel(modelID);

		const modelMatrix = mat4.create();
		// left-facing to front-facing
		mat4.rotateY(modelMatrix, modelMatrix, -3.141592 / 2);
		// z-up to y-up
		mat4.rotateX(modelMatrix, modelMatrix, -3.141592 / 2);
		// scale to height = 10
		mat4.scale(modelMatrix, modelMatrix, [10, 10, 10].map(ten => ten / (m.Y.max - m.Y.min)))
		// center model
		mat4.translate(modelMatrix, modelMatrix, [-(m.X.max + m.X.min) / 2, -(m.Y.max + m.Y.min) / 2, -(m.Z.max + m.Z.min) / 2]);
		// modelRenderer.createInstance(modelID, modelMatrix);
		modelManager.instantiate(gl, modelID, modelMatrix);
	}),
	mergeMap(([program]) => interval(1000 / refreshFrequency).pipe(startWith(-1)).pipe(
		tap((i: number) => {
			const percent = ((refreshFrequency * (i + 1)) / roundTime) % 1;
	
			gl.setResolutionToDisplayResolution();
			gl.clearViewport(vec3.fromValues(0.0, 0.0, 0.0));

			cameraManager.setPosition(char.getPosition());
			cameraManager.setDirection(char.getDirection());
	
			cameraManager.nextFrame(gl, program);
			lightingManager.nextFrame(gl, program);
			modelManager.nextFrame(gl, program, buffer);
			renderCounter++;
		})
	))
).subscribe();
