
export const VOID_VERTEX_SHADER =
`

attribute vec4 position;

varying highp vec3 v_color;

void main() {
	v_color = position.xyz;
	gl_Position = position;
}
`;
