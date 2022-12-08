uniform mat4 mModelView;
uniform mat4 mProjection;
uniform mat4 mNormals;

attribute vec4 vPosition;
attribute vec3 vNormal;

varying vec4 fNormal;
varying vec4 fPosition;

void main() {
    fPosition = vPosition;

    gl_Position = mProjection * mModelView * vPosition;
    fNormal = vec4(vNormal, 0.0);
}