//TODO: make temp Vector3's to not instantiate as many. Replace new THREE.Vector3 with them where reasonable

import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
//debug view
import { ShadowMapViewer } from 'three/addons/utils/ShadowMapViewer.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import { Athlete } from './athlete.js';

import { animate } from './animate.js';

import { cameraFunctionIndex, setCameraFunctionIndex, cameraFunctions } from './camera.js';

import { trackDataToGameTrack, getTrackPos100,getTrackPos110,getTrackPos200,getTrackPos400,getTrackPos800,getTrackPos1500 } from './trackUtil.js';
import { mapRange } from './util.js';

import { pmod } from './util.js';

import { GPUPicker } from './GPUPicker.js';
import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";
//loading
export const LOADINGSTATES = {
    INIT: 0,
    AWAITING: 1,
    PLAYING: 2,
}
export const PRELOAD = 3; //seconds of data to wait for before starting animation

//rendering
export let camera, renderer, rendererCSS;
export let clock;

//scene
export let scene;
export let athleteParent;

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
export let matText;

//loaders
const gltfLoader = new GLTFLoader();
let athleteGLTF;

//mouse
export const mouse = new THREE.Vector2();
export let picker;

//race
export let race;

//debug
export let DEBUG = false;

async function init() {

    initIO();
    initRender();
    initLights();
    initTrack();
    athleteGLTF = await initAthleteModel();
    initSocket();

    animate();
}

function initIO() {
    document.addEventListener( 'mousemove', onMouseMove );

    window.onkeydown = (e) => {
        if (e.code === 'ArrowRight') {
            setCameraFunctionIndex(cameraFunctionIndex + 1);
        }
        else if (e.code === 'ArrowLeft') {
            setCameraFunctionIndex(cameraFunctionIndex - 1);
        }
        else if (e.code === 'Numpad0') {
            setCameraFunctionIndex(0); //Manual
            camera.fov = 20;
            camera.updateProjectionMatrix();
        }
        else if (e.code === 'Numpad5') {
            setCameraFunctionIndex(1); //Tracking
            camera.fov = 20;
            camera.updateProjectionMatrix();
        }
        else if (e.code === 'Numpad6') {
            setCameraFunctionIndex(2); //Framing
            camera.fov = 5;
            camera.updateProjectionMatrix();
        }
        else if (e.code === 'Numpad8') {
            setCameraFunctionIndex(3); //Bird's Eye
            camera.fov = 15;
            camera.updateProjectionMatrix();
        }
        else if (e.code === 'Numpad2') {
            setCameraFunctionIndex(4); //Tailing
            camera.fov = 20;
            camera.updateProjectionMatrix();
        }
        else if (e.code === 'Numpad4') {
            setCameraFunctionIndex(5); //Frame All
            camera.fov = 5;
            camera.updateProjectionMatrix();
        }
    };
}

function initRender() {
    //Z-axis up to match Blender coordinates
    THREE.Object3D.DEFAULT_UP = new THREE.Vector3( 0,0,1 );

    //init rendering
    clock = new THREE.Clock();
    clock.start();

    //TODO: check if antialiasing is too harmful for performance
    renderer = new THREE.WebGLRenderer( {antialias: true} ); 
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    document.body.appendChild( renderer.domElement );

    rendererCSS = new CSS2DRenderer();
    rendererCSS.setSize( window.innerWidth, window.innerHeight );
    rendererCSS.domElement.style.position = 'absolute';
    rendererCSS.domElement.style.top = '0px';
    document.body.appendChild( rendererCSS.domElement );

    camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set( 10,5,5 );
    camera.lookAt( 0,0,0 );

    controls = new OrbitControls( camera, rendererCSS.domElement );
    controls.target.set( 0, 2, 0 );
    controls.update();

    window.addEventListener( 'resize', onWindowResize );

    //scene
    scene = new THREE.Scene();

    athleteParent = new THREE.Object3D();

    scene.add(athleteParent);

    picker = new GPUPicker(renderer, scene, camera);
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
        let mat = new THREE.MeshPhongMaterial({ color: 0xD7D7D7 });
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
    matText = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

    return load('./models/athlete3.glb').then((gltf) => gltf);
}

let globalTOffset;
function initSocket() {
    //receive race data from server
    const socket = io('http://localhost:8082');
    socket.on('tracking', (msg) => {
        if (race === undefined) {
            initRace(msg);
        }
        else {
            //TODO: this is kinda weird maybe should fix on server side?
            //these two if statements allow raceTime to keep counting up after the first place runner
            //has finished, because currently raceTime stops counting after first place finishes
            if (globalTOffset === undefined && msg.raceTime !== 0) {
                globalTOffset = msg.raceTime - msg.globalTime;
            }
            if (msg.raceTime === msg.pRaceTime && msg.raceTime > 0 && globalTOffset !== undefined) {
                msg.raceTime = msg.globalTime + globalTOffset;
            }
            updateRace(msg);
        }
    });
}

function initRace(msg) {
    //The race object holds:
    // -The race data as it comes in from the server
    // -The state of what time slice we are viewing the race at, 
    //      whether we are playing/awaiting data
    // -The athletes (accessible by list sorted by rank at the current race.time, and by ID)

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
        athletesList: [],
    };

    //Create Athlete models
    for (let id in msg.athletes) {
        let athleteResult = msg.athletes[id];
        let c = SkeletonUtils.clone(athleteGLTF.scene);
        let athlete = new Athlete(c, athleteGLTF.animations, athleteResult, id);

        race.athletes[id] = athlete;
        race.athletesList.push(athlete);
    }

    if (race.eventName.includes('100')) {
        race.f = getTrackPos100;
    }
    else if (race.eventName.includes('110')) {
        race.f = getTrackPos110;
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

    if (race.eventName.includes('Hurdles')) {
        let hurdleHeight, hurdle0, hurdleSpacing, hurdleCount;
        //TODO: slow down hurdle step

        if (race.eventName.includes('Men')) {
            if (race.eventName.includes('110')) {
                hurdleHeight = 1.067;
                hurdle0 = 13.72;
                hurdleSpacing = 9.14;
                hurdleCount = 10;
            }
            else if (race.eventName.includes('400')) {
                hurdleHeight = 0.914;
                hurdle0 = 45;
                hurdleSpacing = 35;
                hurdleCount = 10;
            }
        }
        else if (race.eventName.includes('Women')) {
            if (race.eventName.includes('100')) {
                hurdleHeight = 0.840;
                hurdle0 = 13.00;
                hurdleSpacing = 8.50;
                hurdleCount = 10;
            }
            else if (race.eventName.includes('400')) {
                hurdleHeight = 0.762;
                hurdle0 = 45;
                hurdleSpacing = 35;
                hurdleCount = 10;
            }
        }

        let lastHurdle = hurdle0 + hurdleSpacing * (hurdleCount - 1);

        race.setTime = (time) => {
            let msg = interpolateMsgs(time);

            //phase at hurdles should be 0.4
            //phase should roughly increase by 1 every 5.8m
            let phaseRatioStart = (Math.ceil(hurdle0 / 5.8 - 0.4) + 0.4) / hurdle0;
            let phaseRatio = Math.ceil(hurdleSpacing / 5.8) / hurdleSpacing;

            //Set dist, posTheta
            for (let id in race.athletes) {
                let athlete = race.athletes[id];
                let amsg = msg.athletes[id];

                athlete.dist = amsg.pathDistance;

                let phase, hurdle;

                
                let posTheta = race.f(athlete.lane, amsg.pathDistance); 
                
                if (amsg.pathDistance < hurdle0) {
                    //before first hurdle
                    let d = amsg.pathDistance
                    let p0 = phaseRatioStart * 2;
                    let p1 = phaseRatioStart;
                    // quadratic with
                    // dPhase/dDistance = p0 @ distance=0
                    // dPhase/dDistance = p1 @ distance=hurdle0
                    // phase = hurdle0*p1    @ distance=hurdle0
                    // to make there be more steps taken at start to account for shorter stride length
                    phase = (p1 - p0)/hurdle0/2 * d*d + p0*d + hurdle0 * (p1 - p0) / 2;
                    hurdle = Math.sqrt(Math.max(0, 1/2 * (2 - Math.abs(hurdle0 - amsg.pathDistance))));
                }
                else if (amsg.pathDistance < lastHurdle) {
                    //middle hurdles
                    phase = (amsg.pathDistance - hurdle0) * phaseRatio + 0.4;
                    let d = (amsg.pathDistance - hurdle0) % hurdleSpacing;
                    d = (d + hurdleSpacing/2) % hurdleSpacing;
                    hurdle = Math.sqrt(Math.max(0, 1/2 * (2 - Math.abs(d - hurdleSpacing/2))));
                }
                else if (amsg.pathDistance < race.raceDistance) {
                    //after last hurdle
                    phase = (amsg.pathDistance - hurdle0) * phaseRatio + 0.4;
                    hurdle = Math.sqrt(Math.max(0, 1/2 * (2 - Math.abs(amsg.pathDistance - (hurdle0 + (hurdleCount-1) * hurdleSpacing)))));
                }
                else {
                    //TODO: after race use x,y data
                    let p = trackDataToGameTrack(amsg.x, amsg.y);
                    posTheta.p = p;
                    
                    athlete.posTheta = posTheta;
                    athlete.pose();
                    continue;
                }
                phase = pmod(phase, 1);
                posTheta.p.z += hurdle * (hurdleHeight - 0.840); //hurdle animation was animated at height 0.840, correct height of leap
                athlete.posTheta = posTheta;
                athlete.pose(phase, hurdle);
            }

            race.time = time;
            race.athletesList.sort((b,a) => a.dist - b.dist);
        }

        // Add hurdle models
        gltfLoader.load('./models/hurdle.glb', (gltf) => {
            let matPoles = new THREE.MeshPhongMaterial({ color: 0x7993BC });
            let matBars = new THREE.MeshPhongMaterial({ color: 0x121F43 });
            let imb0, imb1, imt0, imt1;
            let ims = [];
            for (let child of gltf.scene.children) {
                if (child.name === 'hurdleTopPoles') {
                    imt0 = new THREE.InstancedMesh(child.geometry.clone(), matPoles, 9 * hurdleCount);
                    scene.add(imt0);
                    ims.push(imt0);
                    imt0.position.z = hurdleHeight;
                }
                else if (child.name === 'hurdleBar') {
                    imt1 = new THREE.InstancedMesh(child.geometry.clone(), matBars, 9 * hurdleCount);
                    scene.add(imt1);
                    ims.push(imt1);
                    imt1.position.z = hurdleHeight;
                }
                else if (child.name === 'hurdleBasePoles') {
                    imb0 = new THREE.InstancedMesh(child.geometry.clone(), matPoles, 9 * hurdleCount);
                    scene.add(imb0);
                    ims.push(imb0);
                }
                else {
                    imb1 = new THREE.InstancedMesh(child.geometry.clone(), matBars, 9 * hurdleCount);
                    scene.add(imb1);
                    ims.push(imb1);
                }
            }
            let m = new THREE.Matrix4();
            m.identity();
            let v = new THREE.Vector3();
            for (let im of ims) {
                for (let i = 0; i < hurdleCount; i++) {
                    let dist = hurdle0 + i * hurdleSpacing;
                    for (let lane = 1; lane <= 9; lane++) {
                        let index = i*9 + lane-1;
                        let posTheta = race.f(lane, dist);
                        m.makeRotationZ(posTheta.theta);
                        m.setPosition(posTheta.p.x, posTheta.p.y, 0);
                        im.setMatrixAt(index, m);
                        im.getMatrixAt(index, m);
                    }
                }
                im.instanceMatrix.needsUpdate = true;
            }
        });
    }
    else if (race.eventName.includes('100') || race.eventName.includes('200') || race.eventName.includes('400')) {
        //Laned Races

        //requires that time is in range [race.minTime, race.maxTime]
        race.setTime = (time) => {
            let msg = interpolateMsgs(time);

            //Set dist, posTheta
            for (let id in race.athletes) {
                let athlete = race.athletes[id];
                let amsg = msg.athletes[id];

                athlete.dist = amsg.pathDistance;
                athlete.posTheta = race.f(athlete.lane, amsg.pathDistance); //TODO: before and after race use x,y data?
                athlete.pose();
            }

            race.time = time;
            race.athletesList.sort((b,a) => a.dist - b.dist);
        }
    }
    else if (race.eventName.includes('800') || race.eventName.includes('1500') || race.eventName.includes('3000')) {
        //Un-laned races

        //requires that time is in range [race.minTime, race.maxTime]
        race.setTime = (time) => {
            let msg = interpolateMsgs(time);

            //Set dist, posTheta
            for (let id in race.athletes) {
                let athlete = race.athletes[id];
                let amsg = msg.athletes[id];

                athlete.dist = amsg.pathDistance;
                //TODO: before and after race use x,y data
                let posTheta = race.f(athlete.lane, amsg.pathDistance);
                athlete.posTheta = {
                    p: trackDataToGameTrack(amsg.x, amsg.y),
                    theta: posTheta.theta
                };
                athlete.pose();
            }

            race.time = time;
            race.athletesList.sort((b,a) => a.dist - b.dist);
        }
    }
}

//find relevant race.msgs, interpolate them to create msg at race.time
//requires that time is in range [race.minTime, race.maxTime]
function interpolateMsgs(time) {
    let msg;
    //TODO: binary search by msg.time, or even better search out from previous index
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

//TODO: mobile compatibility
function onMouseMove(e) {
    //e.preventDefault();

    mouse.x = e.clientX * window.devicePixelRatio, 
    mouse.y = e.clientY * window.devicePixelRatio;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize( window.innerWidth, window.innerHeight );
    rendererCSS.setSize( window.innerWidth, window.innerHeight );
}