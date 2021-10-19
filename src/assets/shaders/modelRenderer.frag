precision highp float;

#define MAX_LIGHTS 4

uniform vec3 u_ambient_light;
uniform vec3 u_directed_light_direction[MAX_LIGHTS];
uniform vec3 u_directed_light_color[MAX_LIGHTS];

varying vec3 v_normal;
varying vec3 v_color;

void main() {
	vec3 ambient_color = u_ambient_light * v_color;
	vec3 diffuse_color = vec3(0.0, 0.0, 0.0);
	for(int i=0;i<MAX_LIGHTS;++i) {
		float diff = max(dot(-normalize(u_directed_light_direction[i]), normalize(v_normal)), 0.0);
		diffuse_color += diff * u_directed_light_color[i];
	}
	diffuse_color = diffuse_color * v_color;

	gl_FragColor = vec4(ambient_color + diffuse_color, 1.0);
}
