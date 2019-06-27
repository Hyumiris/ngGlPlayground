
export const VOID_VERTEX_SHADER =
`
attribute vec4 position;

uniform mat4 view_projection;

varying highp vec3 v_color;

void main() {
	v_color = vec3(0.7, 0.2, 0.4);
	gl_Position = view_projection * position;
}
`;
