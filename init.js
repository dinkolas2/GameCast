import * as THREE from 'three';
//debug view
import { ShadowMapViewer } from 'three/addons/utils/ShadowMapViewer.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';


import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import { Athlete } from './athlete.js';

import { results } from './results.js';

import { animate } from './animate.js';

import { getTrackPos100,getTrackPos200,getTrackPos400,getTrackPos800,getTrackPos1500, STATES } from './trackUtil.js';
import { mapRange } from './util.js';

import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";
//loading
export const LOADINGSTATES = {
    INIT: 0,
    AWAITING: 1,
    PLAYING: 2,
}
export const PRELOAD = 3; //seconds of data to wait for before starting animation

//rendering
export let camera, renderer;
export let clock;

//scene
export let scene;

//light
export let sunLight;
export let envLight;

//misc
export let controls;
export const helpers = [];
export let shadowViewer;

//materials
//import { trackShader } from './shaders/trackShader.js';
//export let matTrack;
export let matSkin;

//loaders
const gltfLoader = new GLTFLoader();
let athleteGLTF;

//race
export let race;

//debug
export let DEBUG = false;

async function init() {

    initRender();
    initLights();
    initTrack();
    athleteGLTF = await initAthleteModel();
    initIO();

    animate();
}

function initRender() {
    //Z-axis up to match Blender coordinates
    THREE.Object3D.DEFAULT_UP = new THREE.Vector3( 0,0,1 );

    //init rendering
    clock = new THREE.Clock();
    clock.start();

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    document.body.appendChild( renderer.domElement );

    camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set( 10,5,5 );
    camera.lookAt( 0,0,0 );

    controls = new OrbitControls( camera, renderer.domElement );
    controls.target.set( 0, 2, 0 );
    controls.update();

    window.addEventListener( 'resize', onWindowResize );

    //scene
    scene = new THREE.Scene();
}

function initLights() {
    //light
    envLight = new THREE.HemisphereLight(0xFEFFF5, 0xFEFFF5, 2);
    scene.add(envLight);

    sunLight = new THREE.DirectionalLight( 0xFFFDE0, 5 );
    sunLight.position.set(0,5,5);
    sunLight.target.position.set(0,0,0);
    sunLight.castShadow = true;

    const shadow = sunLight.shadow;
    shadow.mapSize.width = 1024;
    shadow.mapSize.height = 1024;
    shadow.camera.left = -10;
    shadow.camera.bottom = -10;
    shadow.camera.right = 10;
    shadow.camera.top = 10;
    shadow.camera.near = 1;
    shadow.camera.far = 10;

    scene.add(sunLight);

    let h = new THREE.DirectionalLightHelper(sunLight);
    if (DEBUG) {
        scene.add(h);
    }
    helpers.push(h);
    h = new THREE.CameraHelper( sunLight.shadow.camera );
    if (DEBUG) {
        scene.add(h);

        shadowViewer = new ShadowMapViewer(sunLight);
        shadowViewer.position.x = 10;
        shadowViewer.position.y = 10;
        shadowViewer.size.width = 200;
        shadowViewer.size.width = 200;
        shadowViewer.update();
        shadowViewer.updateForWindowResize();
    }

    
}

function initTrack() {
    //import track model
    gltfLoader.load('./models/trackLines.glb', (gltf) => {
        let child = gltf.scene.children[0];
        let mat = new THREE.MeshPhongMaterial({ color: 0xE7E7E7 });
        mat.depthTest = false;
        child.material = mat;
        child.renderOrder = -1;
        child.receiveShadow = true;
        child.castShadow = false;
        scene.add(child);
    });
    gltfLoader.load('./models/trackGround.glb', (gltf) => {
        let child = gltf.scene.children[0];
        let mat = new THREE.MeshPhongMaterial({ color: 0x7A2F2D });
        mat.depthWrite = true;
        child.material = mat;
        child.renderOrder = -2;
        child.receiveShadow = true;
        child.castShadow = false;
        scene.add(child);
    });
}

async function initAthleteModel() {
    const load = (fileName) => new Promise((resolve) => gltfLoader.load(fileName, resolve));

    matSkin = new THREE.MeshPhongMaterial({ color: 0x2B2F40 });

    return load('./models/athlete2.glb').then((gltf) => gltf);
}

let globalTOffset;
function initIO() {
    //receive race data from server
    const socket = io('http://localhost:8082');
    socket.on('tracking', (msg) => {
        console.log('io input', msg);

        if (race === undefined) {
            initRace(msg);
        }
        else {
            if (globalTOffset === undefined && race.raceTime !== 0) {
                globalTOffset = msg.raceTime - msg.globalTime;
                console.log('GLOBALTOFFSET', globalTOffset);
            }
            if (msg.raceTime === msg.pRaceTime && msg.raceTime > 0 && globalTOffset !== undefined) {
                msg.raceTime = msg.globalTime + globalTOffset;
            }
            updateRace(msg);
        }
    });
}

function initRace(msg) {
    //race basics
    race = {
        loadingState: LOADINGSTATES.INIT,
        eventName: msg.eventName,
        raceDistance: msg.raceDistance,
        minTime: msg.raceTime,
        maxTime: msg.raceTime,
        time: msg.raceTime,
        msgs: [msg],
        athletes: {},
    };

    for (let id in msg.athletes) {
        let athleteResult = msg.athletes[id];
        let c = SkeletonUtils.clone(athleteGLTF.scene);
        let athleteModel = new Athlete(c, athleteGLTF.animations, athleteResult);
        athleteModel.race = race;

        let athlete = {
            athleteModel,
            lane: athleteResult.lane,
        };
        race.athletes[id] = athlete;
    }

    if (race.eventName.includes('100')) {
        race.f = getTrackPos100;
    }
    else if (race.eventName.includes('200')) {
        race.f = getTrackPos200;
    }
    else if (race.eventName.includes('400')) {
        race.f = getTrackPos400;
    }
    else if (race.eventName.includes('800')) {
        race.f = getTrackPos800;
    }
    else if (race.eventName.includes('1500')) {
        race.f = getTrackPos1500;
    }

    if (race.eventName.includes('100') || race.eventName.includes('200') || race.eventName.includes('400')) {
        //requires that time is in range [race.minTime, race.maxTime]
        race.setTime = (time) => {
            //TODO: binary search by msg.time, or even better search out from previous index
            //find relevant msgs, interpolate them to create msg at race.time
            
            let msg = interpolateMsgs(time);

            //Set dist, posTheta
            for (let id in race.athletes) {
                let athlete = race.athletes[id];
                let athleteModel = athlete.athleteModel;
                let amsg = msg.athletes[id];

                athleteModel.dist = amsg.pathDistance;
                athleteModel.posTheta = race.f(athlete.lane, amsg.pathDistance); //TODO: before and after race use x,y data
                athleteModel.pose();
            }

            race.time = time;
        }
    }
    else if (race.eventName.includes('800') || race.eventName.includes('1500') || race.eventName.includes('3000')) {
        //requires that time is in range [race.minTime, race.maxTime]
        race.setTime = (time) => {
            //TODO: binary search by msg.time, or even better search out from previous index
            //find relevant msgs, interpolate them to create msg at race.time
            
            
            let msg = interpolateMsgs(time);

            //Set dist, posTheta
            for (let id in race.athletes) {
                let athlete = race.athletes[id];
                let athleteModel = athlete.athleteModel;
                let amsg = msg.athletes[id];

                athleteModel.dist = amsg.pathDistance;
                let posTheta = race.f(athlete.lane, amsg.pathDistance);
                athleteModel.posTheta = {
                    p: trackDataToGameTrack(amsg.x, amsg.y),
                    theta: posTheta.theta
                };
                //race.f(athlete.lane, amsg.pathDistance); //TODO: before and after race use x,y data
                athleteModel.pose();
            }

            race.time = time;
        }
    }
}

const centerX = -39.3447;
const centerY = -42.2861;

function trackDataToGameTrack(x,y) {
    return new THREE.Vector3(
        (y - 2*39.3447 + 1) * 1.08,
        -x - 2*42.2861,
        0
    );
}

function interpolateMsgs(time) {
    let msg;
    for (let i = 0; i < race.msgs.length - 1; i++) {
        let msg0 = race.msgs[i];
        if (time === msg0.raceTime) {
            msg = msg0;
            break;
        }
        else if (msg0.raceTime < time) {
            let msg1 = race.msgs[i+1];
            if (time < msg1.raceTime) {
                let f = mapRange(time, msg0.raceTime,msg1.raceTime, 0,1);
                msg = {
                    fake: true,
                    athletes: {},
                }
                for (let id in msg0.athletes) {
                    let a0 = msg0.athletes[id];
                    let a1 = msg1.athletes[id];
                    msg.athletes[id] = {
                        pathDistance: mapRange(f, 0,1, a0.pathDistance, a1.pathDistance),
                        x: mapRange(f, 0,1, a0.x, a1.x),
                        y: mapRange(f, 0,1, a0.y, a1.y),
                    };
                }
                break;
                //TODO: assign ranks by sorting by pathDistance
            }
        }
    }
    if (msg === undefined) {
        msg = race.msgs[race.msgs.length - 1];
    }
    return msg;
}

function updateRace(msg) {
    race.msgs.push(msg); //TODO: insert into list in case msgs come out of order
    race.minTime = Math.min(race.minTime, msg.raceTime);
    race.maxTime = Math.max(race.maxTime, msg.raceTime);
}

init();

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize( window.innerWidth, window.innerHeight );
}