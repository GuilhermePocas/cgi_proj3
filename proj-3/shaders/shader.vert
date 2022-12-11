uniform mat4 mModelView;
uniform mat4 mNormals;
uniform mat4 mProjection;


attribute vec4 vPosition;
attribute vec3 vNormal;


varying vec3 fNormal;
varying vec4 fPosition;

void main() {
    fPosition = vPosition;

    fNormal = (mNormals * vec4(vNormal, 0.0)).xyz;

    gl_Position = mProjection * mModelView * vPosition;
}