export const MODEL_RENDERER_FRAGMENT_SHADER =
`
precision highp float;

#define MAX_LIGHTS 4

uniform vec3 u_ambient_light;
uniform vec3 u_diffuse_light[2 * MAX_LIGHTS];

varying vec3 v_normal;
varying vec3 v_color;

void main() {
	vec3 ambient_color = u_ambient_light * v_color;
	vec3 diffuse_color = vec3(0.0, 0.0, 0.0);
	for(int i=0;i<MAX_LIGHTS;++i) {
		float diff = max(dot(-normalize(u_diffuse_light[2 * i]), normalize(v_normal)), 0.0);
		diffuse_color += diff * u_diffuse_light[2 * i + 1];
	}

	gl_FragColor = vec4(ambient_color + diffuse_color, 1.0);
}

`;
