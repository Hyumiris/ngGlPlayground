export const MODEL_RENDERER_FRAGMENT_SHADER =
`
varying highp vec3 v_color;

void main() {
	gl_FragColor = vec4(v_color, 1.0);
}

`;