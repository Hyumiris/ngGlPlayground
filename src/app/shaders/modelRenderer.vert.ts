export const MODEL_RENDERER_VERTEX_SHADER =
`
attribute vec3 position;
attribute vec3 normal;
attribute float instanceIndex;

uniform mat4 view;
uniform mat4 projection;
uniform mat4 modelMatrices[100];
uniform mat4 normalMatrices[100];

varying vec3 v_color;
varying vec3 v_normal;

void main() {
	vec4 transformed_normal = normalMatrices[int(instanceIndex)] * vec4(normal, 1.0);

	v_color = vec3(0.7, 0.7, 0.7);
	v_normal = transformed_normal.xyz;
	gl_Position = projection * view * modelMatrices[int(instanceIndex)] * vec4(position, 1.0);
}
`;
