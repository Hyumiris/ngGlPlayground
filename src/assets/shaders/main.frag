precision highp float;

#define MAX_LIGHTS 4

uniform vec3 u_ambient_light;
uniform vec3 u_directed_light_direction[MAX_LIGHTS];
uniform vec3 u_directed_light_color[MAX_LIGHTS];

uniform vec3 material_ambient;
uniform vec3 material_diffuse;
uniform vec3 material_specular;
uniform int material_specular_exp;
uniform float material_alpha;

uniform sampler2D color_map;
uniform sampler2D bump_map;

varying vec3 v_normal;
varying vec2 v_texCoords;

void main() {
	vec2 uv = vec2(v_texCoords.x, 1.0 - v_texCoords.y);
	vec3 color = texture2D(color_map, uv).xyz;
	vec3 bump = texture2D(bump_map, uv).xyz;

	vec3 n_normal = normalize(v_normal + bump);

	vec3 diffuse_light = vec3(0.0, 0.0, 0.0);
	for(int i = 0; i < MAX_LIGHTS; ++i) {
		vec3 n_light_direction = normalize(u_directed_light_direction[i]);
		float diff = max(dot(-n_light_direction, n_normal), 0.0);
		diffuse_light += diff * u_directed_light_color[i];
	}

	vec3 ambient_color = u_ambient_light * material_ambient * color;
	vec3 diffuse_color = diffuse_light * material_diffuse * color;

	gl_FragColor = vec4(ambient_color + diffuse_color, material_alpha);
}
