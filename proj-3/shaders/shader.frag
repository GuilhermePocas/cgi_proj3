precision highp float;

const int MAX_LIGHTS = 5;
const int PONTUAL = 0;
const int DIRECTIONAL = 1;
const int SPOTLIGHT = 2;

struct LightInfo {
    bool on;
    int type;
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    vec4 position;
    vec3 axis;
    float aperture;
    float cutoff;
};

struct MaterialInfo {
    vec3 Ka;
    vec3 Kd;
    vec3 Ks;
    float shininess;
};

uniform mat4 mModelView;
uniform mat4 mNormals;
uniform mat4 mView;
uniform mat4 mViewNormals;
uniform mat4 mProjection;

uniform int uNLights;

uniform LightInfo uLights[MAX_LIGHTS];
uniform MaterialInfo uMaterial;

varying vec3 fNormal;
varying vec4 fPosition;

void main() {
    vec3 posC = (mModelView * fPosition).xyz;

    vec3 I = vec3(0, 0, 0);
    for(int i=0; i<MAX_LIGHTS; i++) {
        if(i == uNLights) break;
        if(!uLights[i].on) continue;

        vec3 L;
        
        if(uLights[i].type == PONTUAL || uLights[i].type == SPOTLIGHT) {
            /*if(uLights[i].position.w == 0.0)
                L = normalize((mViewNormals*uLights[i].position).xyz);
            else*/
                L = normalize((mView*uLights[i].position).xyz - posC);
        } 
        else if(uLights[i].type == DIRECTIONAL) {
            L = normalize(uLights[i].position.xyz);
        }

        vec3 N = normalize(fNormal);
        vec3 V = normalize(-posC);
        vec3 R = reflect(-L, N);


        vec3 ambientColor = uLights[i].ambient/255.0 * uMaterial.Ka/255.0;
        vec3 diffuseColor = uLights[i].diffuse/255.0 * uMaterial.Kd/255.0;
        vec3 specularColor = uLights[i].specular/255.0 * uMaterial.Ks/255.0;

        
        float diffuseFactor = max(dot(L, N), 0.0);
        vec3 diffuse = diffuseFactor * diffuseColor;

        float specularFactor = pow(max(dot(N,R), 0.0), uMaterial.shininess);
        vec3 specular = specularFactor * specularColor;
        
        if(dot(L, N) < 0.0) {
            specular = vec3(0.0, 0.0, 0.0);
        }

        if(uLights[i].type == SPOTLIGHT) {
            float angle = acos(dot(L ,normalize(-uLights[i].axis)));
            if(angle < uLights[i].aperture) {

                vec3 Iinc = ambientColor + diffuse + specular;
                float c = pow(cos(angle), uLights[i].cutoff);
                I += vec3(mix(0.0, Iinc.x, c),
                 mix(0.0, Iinc.y, c),
                 mix(0.0, Iinc.z, c));
            }
        }
        else {
        I += ambientColor + diffuse + specular;
        }
    }
    gl_FragColor = vec4(I.x, I.y, I.z, 1.0);
}