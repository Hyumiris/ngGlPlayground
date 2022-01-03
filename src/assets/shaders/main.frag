precision highp float;

#define MAX_LIGHTS 4

uniform vec3 viewPos;

uniform vec3 u_ambient_light;
uniform vec3 u_directed_light_direction[MAX_LIGHTS];
uniform vec3 u_directed_light_color[MAX_LIGHTS];

uniform vec3 material_ambient;
uniform vec3 material_diffuse;
uniform vec3 material_specular;
uniform float material_specular_exp;
uniform float material_alpha;
uniform float material_illum;

uniform sampler2D color_map;
uniform sampler2D bump_map;

varying vec3 v_position;
varying vec3 v_normal;
varying vec2 v_texCoords;

void main() {
	vec2 uv = vec2(v_texCoords.x, 1.0 - v_texCoords.y);
	vec3 color = texture2D(color_map, uv).xyz;
	vec3 bump = texture2D(bump_map, uv).xyz;

	vec3 n_normal = normalize(v_normal);

	vec3 fragColor = u_ambient_light * material_ambient * color;

	if (material_illum > 0.5) {
		vec3 diffuse_light = vec3(0.0, 0.0, 0.0);
		for(int i = 0; i < MAX_LIGHTS; ++i) {
			vec3 n_light_direction = normalize(u_directed_light_direction[i]);
			float diff = max(dot(-n_light_direction, n_normal), 0.0);
			diffuse_light += diff * u_directed_light_color[i];
		}

		fragColor += diffuse_light * material_diffuse * color;
	}

	if (material_illum > 1.5) {
		vec3 viewDirection = normalize(viewPos - v_position);
		vec3 specular_light = vec3(0.0, 0.0, 0.0);
		for(int i = 0; i < MAX_LIGHTS; ++i) {
			vec3 n_light_direction = normalize(u_directed_light_direction[i]);
			vec3 reflectDirection = reflect(n_light_direction, n_normal);
			float alignedness = max(dot(viewDirection, reflectDirection), 0.0);
			float spec = pow(alignedness, max(material_specular_exp, 0.0001));
			specular_light += spec * u_directed_light_color[i];
		}

		fragColor += specular_light * material_specular * color;
	}
	

	gl_FragColor = vec4(fragColor, material_alpha);
}
