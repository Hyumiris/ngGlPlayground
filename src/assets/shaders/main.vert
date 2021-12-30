
#define MAX_INSTANCES 100

attribute vec3 position;
attribute vec3 normal;
attribute vec2 texCoords;
attribute float instanceIndex;

uniform mat4 view;
uniform mat4 projection;
uniform mat4 modelMatrices[MAX_INSTANCES];
uniform mat4 normalMatrices[MAX_INSTANCES];

varying vec3 v_position;
varying vec3 v_normal;
varying vec2 v_texCoords;

void main() {
	vec4 transformed_normal = normalMatrices[int(instanceIndex)] * vec4(normal, 1.0);
	vec4 worldSpacePosition = view * modelMatrices[int(instanceIndex)] * vec4(position, 1.0);

	v_position = worldSpacePosition.xyz;
	v_normal = transformed_normal.xyz;
	v_texCoords = texCoords;
	gl_Position = projection * worldSpacePosition;
}
