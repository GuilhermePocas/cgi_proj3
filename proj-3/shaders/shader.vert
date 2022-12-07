uniform mat4 mModelView;
uniform mat4 mProjection;
uniform mat4 mNormals;

attribute vec4 vPosition;
attribute vec3 vNormal;

varying vec4 fNormal;
varying vec3 posC;

void main() {
    posC = (mModelView * vPosition).xyz;

    gl_Position = mProjection * mModelView * vPosition;
    fNormal = vec4(vNormal, 0.0);
}