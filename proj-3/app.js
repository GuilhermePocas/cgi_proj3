import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, mult, mat4, vec4, vec3, inverse, perspective, transpose } from "../../libs/MV.js";
import { GUI } from "../../libs/dat.gui.module.js";
import {modelView, loadMatrix, multRotationY, multRotationX, multRotationZ, multTranslation, multScale, pushMatrix, popMatrix, multMatrix} from "../../libs/stack.js";

import * as SPHERE from '../../libs/objects/sphere.js';
import * as CUBE from '../../libs/objects/cube.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';
import * as PYRAMID from '../../libs/objects/pyramid.js';
import * as TORUS from '../../libs/objects/torus.js';
import * as BUNNY from '../../libs/objects/bunny.js'
import { rotateY } from "../../libs/MV.js";

/** @type WebGLRenderingContext */
let gl;

let time = 0;           // Global simulation time in days
let speed = 1/144.0;     // Speed (how many days added to time on each render pass
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running

const MAX_LIGHTS = 1;

const FLOOR_LENGTH = 10;
const FLOOR_HEIGHT = 0.5; 
const FLOOR_COLOR = vec3(168/255, 113/255, 71/255);

const OBJECT_SCALE = [2, 2, 2];
const BUNNY_SCALE = [10, 10, 10];
const BUNNY_COLOR = vec3(230/255, 108/255, 21/255);
const PYRAMID_COLOR = vec3(27/255, 71/255, 227/255);
const TORUS_COLOR = vec3(189/255, 43/255, 196/255);
const CUBE_COLOR = vec3(47/255, 241/255, 245/255);

const VP_DISTANCE = 10;

let nLights = 1;

class lightClass {
    constructor(ambient, diffuse, specular, position, axis, aperture, cutoff) {
        this.ambient = ambient;
        this.diffuse = diffuse;
        this.specular = specular;
        this.position = position;
        this.axis = axis;
        this.aperture = aperture;
        this.cutoff = cutoff;
    }
}

class materialClass {
    constructor(Ka, Kd, Ks, shininess) {
        this.Ka = Ka,
        this.Kd = Kd,
        this.Ks = Ks,
        this.shininess = shininess
    }
}

function setup(shaders)
{
    let options = {
        backCulling: true,
        depthTest: true
    };

    let camera = {
        eye:vec3(0,5,10),
        at:vec3(0,0,0),
        up: vec3(0,1,0),
        fovy:45,
        near: 0.1,
        far:40
    };
    
    let lights = [
        new lightClass(
        vec3(50,50,50),
        vec3(60,60,60),
        vec3(200,200,200),
        vec4(40.0,0.0,10.0,1.0),
        vec3(30.0, 0.0, -1.0),
        10.0,
        -1)
    ];

    let floor = new materialClass(
            vec3(255, 0.0, 0.0),
            vec3(255, 0.0, 0.0),
            vec3(255, 255, 255),
            6.0);
    let bunny = new materialClass(
            vec3(0, 150, 100),
            vec3(0, 125, 100),
            vec3(200, 200, 200),
            10.0);
    let cube = new materialClass(
            vec3(255, 0.0, 0.0),
            vec3(255, 0.0, 0.0),
            vec3(255, 0, 255),
            5.0);
    let pyramid = new materialClass(
            vec3(255, 0.0, 0.0),
            vec3(255, 0.0, 0.0),
            vec3(255, 0, 255),
            4.0);
    let torus = new materialClass(
            vec3(255, 0.0, 0.0),
            vec3(255, 0.0, 0.0),
            vec3(255, 0, 255),
            2.0);
        

    const sceneGUI = new GUI();
    const optionsGUI = sceneGUI.addFolder("options");

    optionsGUI.add( options,"backCulling").name("backface culling")
    .onChange(function(x) {if(x) gl.enable(gl.CULL_FACE); else gl.disable(gl.CULL_FACE);})  

    optionsGUI.add( options,"depthTest").name("depth test")
    .onChange(function(x) {if(x) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);})
    
    const cameraGUI = sceneGUI.addFolder("camera");
    cameraGUI.add(camera, 'fovy', 1, 100, 1);
    cameraGUI.add(camera, 'near', 0.1, 20, 0.1);
    cameraGUI.add(camera, 'far', 0.1, 20, 0.1);
    const eyeGUI = cameraGUI.addFolder("eye");
    const atGUI = cameraGUI.addFolder("at");
    const upGUI = cameraGUI.addFolder("up");
    eyeGUI.add(camera.eye, 0).name("x").step(0.1);
    eyeGUI.add(camera.eye, 1).name("y").step(0.1);
    eyeGUI.add(camera.eye, 2).name("z").step(0.1);
    atGUI.add(camera.at, 0).name("x").step(0.1);
    atGUI.add(camera.at, 1).name("y").step(0.1);
    atGUI.add(camera.at, 2).name("z").step(0.1);
    upGUI.add(camera.up, 0, -1, 1, 0.02).name("x").step(0.1).listen();
    upGUI.add(camera.up, 1, -1, 1, 0.02).name("y").step(0.1).listen();
    upGUI.add(camera.up, 2, -1, 1, 0.02).name("z").step(0.1).listen();




    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = perspective(camera.fovy, aspect, camera.near, camera.far);
    //let mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-3*VP_DISTANCE,3*VP_DISTANCE)

    mode = gl.TRIANGLES; 

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    document.onkeydown = function(event) {
        switch(event.key) {
            case 'w':
                mode = gl.LINES; 
                break;
            case 's':
                mode = gl.TRIANGLES;
                break;
            case 'p':
                animation = !animation;
                break;
            case '+':
                if(animation) speed *= 1.1;
                break;
            case '-':
                if(animation) speed /= 1.1;
                break;
        }
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    SPHERE.init(gl);
    PYRAMID.init(gl);
    BUNNY.init(gl);
    CUBE.init(gl);
    TORUS.init(gl);
    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test
    
    window.requestAnimationFrame(render);


    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
        //mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-3*VP_DISTANCE,3*VP_DISTANCE);
        mProjection = perspective(camera.fovy, aspect, camera.near, camera.far);
    }

    function uploadModelView()
    {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
        let mNormals = inverse(transpose(modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mNormals"), false, flatten(mNormals));
    }

    function uploadLights() {
        gl.uniform1i(gl.getUniformLocation(program, "uNLights"), nLights);

        for(let i=0; i<nLights; i++) {
            gl.uniform3fv(gl.getUniformLocation(program, "uLights[" + i + "].ambient"), lights[i].ambient);
            gl.uniform3fv(gl.getUniformLocation(program, "uLights[" + i + "].diffuse"), lights[i].diffuse);
            gl.uniform3fv(gl.getUniformLocation(program, "uLights[" + i + "].specular"), lights[i].specular);
            gl.uniform4fv(gl.getUniformLocation(program, "uLights[" + i + "].position"), lights[i].position);
            gl.uniform3fv(gl.getUniformLocation(program, "uLights[" + i + "].axis"), lights[i].axis);
            gl.uniform1f(gl.getUniformLocation(program, "uLights[" + i + "].aperture"), lights[i].aperture);
            gl.uniform1f(gl.getUniformLocation(program, "uLights[" + i + "].cutoff"), lights[i].cutoff);

        }
    }

    function uploadCurrentMaterial(material) {
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Ka"), material.Ka);
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Kd"), material.Kd);
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Ks"), material.Ks);
        gl.uniform1f(gl.getUniformLocation(program, "uMaterial.shininess"), material.shininess);
    }

    function scene() {
        pushMatrix();
            uploadCurrentMaterial(floor);
            multTranslation([0, -FLOOR_HEIGHT/2, 0]);
            multScale([FLOOR_LENGTH, FLOOR_HEIGHT, FLOOR_LENGTH]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        popMatrix();
        pushMatrix();
            uploadCurrentMaterial(bunny);
            multTranslation([2, 0, 2]);
            multScale(BUNNY_SCALE);
            uploadModelView();
            BUNNY.draw(gl, program, mode);
        popMatrix();
        pushMatrix();
            uploadCurrentMaterial(cube);
            multTranslation([2, 1, -2]);
            multScale(OBJECT_SCALE);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        popMatrix();
        pushMatrix();
            uploadCurrentMaterial(pyramid);
            multTranslation([-2, 1, -2]);
            multScale(OBJECT_SCALE);
            uploadModelView();
            PYRAMID.draw(gl, program, mode);
        popMatrix();
        pushMatrix();
            uploadCurrentMaterial(torus);
            multTranslation([-2, 0.4, 2]);
            multScale(OBJECT_SCALE);
            uploadModelView();
            TORUS.draw(gl, program, mode);
        popMatrix();
    }


    function render()
    {

        if(animation) time += speed;
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);

        mProjection = perspective(camera.fovy, aspect, camera.near, camera.far);
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));

        for(const l in lights) {
            
        }
    
        loadMatrix(lookAt([camera.eye[0], camera.eye[1], camera.eye[2]],
                        [camera.at[0], camera.at[1], camera.at[2]],
                        [camera.up[0], camera.up[1], camera.up[2]]));
        
        uploadLights();
        scene();
    }

    function updateColor(color) {
        gl.useProgram(program);
        const uColor = gl.getUniformLocation(program, "uColor");
        gl.uniform3fv(uColor, color);
    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))