attribute vec3 position;
attribute vec3 normal;

uniform mat4 view_projection;

varying vec3 v_color;

void main() {
	v_color = normal;
	gl_Position = view_projection * vec4(position, 1.0);
}