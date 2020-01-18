export const MODEL_RENDERER_VERTEX_SHADER =
`
attribute vec3 position;
attribute vec3 normal;
attribute float instanceIndex;

uniform mat4 viewProjection;
uniform mat4 modelMatrices[100];

varying vec3 v_color;

void main() {
	v_color = normal;
	gl_Position = viewProjection * modelMatrices[int(instanceIndex)] * vec4(position, 1.0);
}
`;
