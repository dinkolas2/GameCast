//TODO: make temp Vector3's to not instantiate as many. Replace new THREE.Vector3 with them where reasonable

const DEV = true;

import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
//debug view
import { ShadowMapViewer } from 'three/addons/utils/ShadowMapViewer.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import { Athlete } from './athlete.js';

import { animate } from './animate.js';

import { cameraFunctionIndex, setCameraFunctionIndex, cameraFunctions } from './camera.js';

import { trackDataTo400mGameTrack, getTrackPos100,getTrackPos110,getTrackPos200,getTrackPos400,getTrackPos800,getTrackPos1500 } from './trackUtil.js';
import { trackDataTo200mGameTrack, buildShortTrackGetPosThetaPhi } from './trackUtil200m.js';
import { mapRange } from './util.js';

import { pmod } from './util.js';

import { GPUPicker } from './GPUPicker.js';
import { io } from "./socketio.js";
//loading
export const LOADINGSTATES = {
    INIT: 0,
    AWAITING: 1,
    PLAYING: 2,
}
export const PRELOAD = 0.05; //seconds of data to wait for before starting animation

//TODO: add this and number of staggered turns to server
//  make an api to request a description of the track from the server
export const is200mTrack = false;
export let allSpeedLines = true;

//rendering
export let camera, renderer, rendererCSS;
export let clock;
export let autoCam = true;

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
export let blockIMs;
export let matSpeedLine = new LineMaterial( {

    color: 0xffffff,
    linewidth: 0.5, // in world units with size attenuation, pixels otherwise
    vertexColors: true,
    worldUnits: true,

    dashed: false,
    alphaToCoverage: false,

} );
matSpeedLine.depthWrite = false;

//loaders
const gltfLoader = new GLTFLoader();
let athleteGLTF;

//mouse
export const mouse = new THREE.Vector2();
export let picker;
export let leaderboardContainer;

//race
export let race;

//debug
export let DEBUG = false;

async function init() {
    initIO();
    initRender();
    initLights();
    initTitle();
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
        }
        else if (e.code === 'Numpad5') {
            setCameraFunctionIndex(1); //Tracking
        }
        else if (e.code === 'Numpad6') {
            setCameraFunctionIndex(2); //Framing
        }
        else if (e.code === 'Numpad8') {
            setCameraFunctionIndex(3); //Bird's Eye
        }
        else if (e.code === 'Numpad2') {
            setCameraFunctionIndex(4); //Tailing
        }
        else if (e.code === 'Numpad4') {
            setCameraFunctionIndex(5); //Frame All
        }
    };
}

function initRender() {
    //Z-axis up to match Blender coordinates
    THREE.Object3D.DEFAULT_UP = new THREE.Vector3( 0,0,1 );

    //init rendering
    clock = new THREE.Clock();
    clock.start();

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

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
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
    sunLight.position.set(0,10,10);
    sunLight.target.position.set(0,0,0);
    sunLight.castShadow = true;

    const shadow = sunLight.shadow;
    shadow.mapSize.width = 1024;
    shadow.mapSize.height = 1024;
    shadow.camera.left = -15;
    shadow.camera.bottom = -15;
    shadow.camera.right = 15;
    shadow.camera.top = 15;
    shadow.camera.near = 1;
    shadow.camera.far = 30;

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
    if (!is200mTrack) {
        // import 400m track model
        gltfLoader.load('./models/400mTrack/trackLines2.glb', (gltf) => {
            let child = gltf.scene.children[0];
            let mat = new THREE.MeshPhongMaterial({ color: 0xD7D7D7 });
            mat.depthTest = false;
            child.material = mat;
            child.renderOrder = -2;
            child.receiveShadow = true;
            child.castShadow = false;
            scene.add(child);
        });
        gltfLoader.load('./models/400mTrack/trackGround.glb', (gltf) => {
            let child = gltf.scene.children[0];
            let mat = new THREE.MeshPhongMaterial({ color: 0x7A2F2D });
            mat.depthWrite = true;
            child.material = mat;
            child.renderOrder = -3;
            child.receiveShadow = true;
            child.castShadow = false;
            scene.add(child);
        });
    }
    else {
        //import 200m track model
        gltfLoader.load('./models/200mTrack/200mTrack3.glb', (gltf) => {
            let red = gltf.scene.getObjectByName('red');
            let blue = gltf.scene.getObjectByName('blue');
            let lines = gltf.scene.getObjectByName('lines');
            // let pad = gltf.scene.getObjectByName('pad'); //TODO: use pad in 60m?
            let rail = gltf.scene.getObjectByName('rail');
            let logoBlack = gltf.scene.getObjectByName('logo_black');
            let logoRed = gltf.scene.getObjectByName('logo_red');
            
            let matRed = new THREE.MeshPhongMaterial({ color: 0x7A2F2D });
            red.material = matRed;
            red.renderOrder = -4;
            red.receiveShadow = true;
            red.castShadow = false;
            scene.add(red);

            let matBlue = new THREE.MeshPhongMaterial({ color: 0x3652E7 });
            blue.material = matBlue;
            blue.renderOrder = -4;
            blue.receiveShadow = true;
            blue.castShadow = false;
            scene.add(blue);

            let matLines = new THREE.MeshPhongMaterial({ color: 0xD7D7D7 });
            matLines.depthTest = false;
            lines.material = matLines;
            lines.renderOrder = -3;
            lines.receiveShadow = true;
            lines.castShadow = false;
            scene.add(lines);

            let matLogoRed = new THREE.MeshPhongMaterial({ color: 0xBE2328, side:THREE.DoubleSide });
            matLogoRed.depthTest = false;
            logoRed.material = matLogoRed;
            logoRed.renderOrder = -4;
            logoRed.receiveShadow = true;
            logoRed.castShadow = false;
            scene.add(logoRed);

            let matLogoBlack = new THREE.MeshPhongMaterial({ color: 0x000000, side:THREE.DoubleSide });
            matLogoBlack.depthTest = false;
            logoBlack.material = matLogoBlack;
            logoBlack.renderOrder = -4;
            logoBlack.receiveShadow = true;
            logoBlack.castShadow = false;
            scene.add(logoBlack);
            
            // let matPad = new THREE.MeshPhongMaterial({ color: 0xD7D7D7 });
            // pad.material = matPad;
            // pad.receiveShadow = true;
            // pad.castShadow = true;
            // scene.add(pad);

            let matRail = new THREE.MeshPhongMaterial({ color: 0xBBBBBB });
            rail.material = matRail;
            rail.renderOrder = -2;
            rail.receiveShadow = true;
            rail.castShadow = true;
            scene.add(rail);
        });
    }
}

async function initAthleteModel() {
    const load = (fileName) => new Promise((resolve) => gltfLoader.load(fileName, resolve));

    matSkin = new THREE.MeshPhongMaterial({ transparent: true, color: 0x2B2F40 });

    return load('./models/athlete3.glb').then((gltf) => gltf);
}

let globalTOffset;
function initSocket() {
    // receive race data from server. If in DEV mode, just use localhost, otherwise
    // use the proxy. (The proxy takes in the raw data from the meet, formats it a bit,
    // and then passes it along to the GameCast. TODO: should revisit whether the proxy
    // should exist. Should the raw data from the meet already be formatted for the 
    // GameCast? Or maybe should the formatting happen at the client? Or maybe the proxy
    // is fine?)
    // For LIVE mode, this should point to proxy server
    // Use command >ipconfig to find my IPv4 address on the local WIFI
    const serverURL = DEV ? 'http://localhost:8082' : 'https://trackcast-proxy.ngrok.io';
    const socket = io(serverURL);
    //ngrok http --url= 80
    socket.on('tracking', (msg) => {
        if (race === undefined) {
            initRace(msg);
        }
        else {
            if (msg.eventName !== race.eventName) {
                //new event, reload page
                //TODO: get rid of true argument
                // (it clears the cache which is convenient for dev changes)
                window.location.reload(true);
            }
            //TODO: this is kinda weird maybe should fix on server side?
            //these two if statements allow raceTime to keep counting up after the first place runner
            //has finished, because currently raceTime stops counting after first place finishes
            if (msg.raceTime !== msg.pRaceTime) {
                globalTOffset = msg.raceTime - Date.now()
            }
            if (msg.raceTime === msg.pRaceTime && msg.raceTime > 0 && globalTOffset !== undefined) {
                msg.raceTime = Date.now() + globalTOffset;
            }
            updateRace(msg);
        }
    });

    //TODO: make a way to receive official results
    // socket.on('results', (msg) => {
    //     if (race === undefined) {
    //         initRace(msg);
    //     }

    //     race.resultsOfficial = true;
    // });
}

function initTitle() {
    leaderboardContainer = document.createElement('div');
    leaderboardContainer.className = 'leaderboard';
    document.body.appendChild(leaderboardContainer);

    const loadingText = document.createElement('div');
    loadingText.innerText = 'Awaiting Race Data';
    leaderboardContainer.appendChild(loadingText);
}

function initLeaderboard() {
    const cameraButtonDiv = document.createElement('div');
    cameraButtonDiv.className = 'cameraButtonDiv';
    document.body.appendChild(cameraButtonDiv);
    const autoCamCheckbox = document.createElement('input');
    autoCamCheckbox.type = 'checkbox';
    autoCamCheckbox.checked = true;
    autoCamCheckbox.id = 'autoCamCheckbox';
    const autoCamLabel = document.createElement("label");
    autoCamLabel.htmlFor = "autoCamCheckbox";
    autoCamLabel.textContent = "Auto Cam";
    cameraButtonDiv.appendChild(autoCamCheckbox);
    cameraButtonDiv.appendChild(autoCamLabel);
    autoCamCheckbox.onchange = (e) => {
        autoCam = e.target.checked;
    }
    
    const cameraFnNamesIndices = [
        ['Manual', 0], 
        ['Frame 3', 2], 
        ['Frame All', 5], 
        ['Tracking', 1], 
        ['Bird', 3],
        ['Tailing', 4],
        ['Leading', 6]
    ];
    for (let nameIndex of cameraFnNamesIndices) {
        const [name, idx] = nameIndex;
        const button = document.createElement('button');
        button.className = 'cameraButton';
        button.textContent = name;
        button.onclick = () => {
            setCameraFunctionIndex(idx);
            autoCamCheckbox.checked = false;
            autoCam = false;
        }
        cameraButtonDiv.appendChild(button)
        if (name === 'Manual') {
            button.id = 'manualCamButton';
            button.title = 'Position with left/right click and scroll';
        }
    }

    leaderboardContainer.innerHTML = '';

    const eventNameDiv = document.createElement('h2');
    eventNameDiv.innerText = race.eventName;
    leaderboardContainer.appendChild(eventNameDiv);

    race.athletesList.sort((a,b) => a.lane - b.lane);

    for (let a of race.athletesList) {
        const labelDiv = document.createElement('div');
        labelDiv.className = 'athleteLabel';
        const labelOffset = document.createElement('div');
        labelOffset.className = 'athleteLabelOffset';
        labelDiv.appendChild(labelOffset);
        let name = document.createElement('div');
        name.className = 'labelName';
        name.textContent = `${a.firstName} ${a.lastName}`;
        labelOffset.appendChild(name);
        const triangleDiv = document.createElement('div');
        triangleDiv.className = 'triangle';
        labelOffset.appendChild(triangleDiv);

        a.labelObjectVisible = 0;
        a.labelObject = new CSS2DObject(labelDiv);
        a.labelObject.position.set(0,0,2);
        a.armature.add(a.labelObject);
        a.labelObject.visible = false;

        a.rankEl = document.createElement('div');
        a.rankEl.className = 'athleteRank';
        
        let laneNum = document.createElement('div');
        laneNum.className = 'laneNum';
        laneNum.textContent = a.lane;
        name = document.createElement('div');
        name.className = 'athleteName';
        name.textContent = `${a.firstName} ${a.lastName}`;
        a.rankEl.appendChild(laneNum);
        a.rankEl.appendChild(name);

        leaderboardContainer.appendChild(a.rankEl);
        a.rankEl.onmouseenter = () => {
            for (let a of race.athletesList) {
                a.unHighlight();
            }
            a.highlight();
            a.labelObjectVisible = 9999;
        }
        a.rankEl.onmouseleave = () => {
            a.labelObjectVisible = 3;
        }
    }
}

function initRace(msg) {
    setCameraFunctionIndex(5); //TODO: line prob not necessary
    //The race object holds:
    // -The race data as it comes in from the server
    // -The state of what time slice we are viewing the race at, 
    //      whether we are playing/awaiting data
    // -The athletes (accessible by list sorted by rank at the current race.time, and by ID in a dictionary)

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
        resultsOfficial: false,
    };

    //TODO: make an API to request a description of the track from the server
    race.trackDataToGameTrack = is200mTrack ? trackDataTo200mGameTrack : trackDataTo400mGameTrack;
    race.hurdles = msg.eventName.includes('Hurdles');
    race.laned = is200mTrack ? (msg.raceDistance <= 400) : (msg.raceDistance <= 400); //TODO: figure out which races for 200m track are unlaned

    //TODO: add stagger to description from server
    if (is200mTrack) {
        if (msg.stagger) {
            race.stagger = msg.stagger;
        }
        else {
            if (race.raceDistance === 200) race.stagger = -1;
            else if (race.raceDistance === 300) race.stagger = -1;
            else if (race.raceDistance === 400) race.stagger = 2;
            else if (race.raceDistance === 600) race.stagger = -1;
            else if (race.raceDistance === 800) race.stagger = 3;
            else if (race.raceDistance === 1500) race.stagger = 0;
            else if (race.eventName.includes('Mile')) race.stagger = 2;
            else race.stagger = 0;
        }
    }

    if (is200mTrack) {
        race.f = buildShortTrackGetPosThetaPhi(race.raceDistance, race.stagger);
    }
    else {
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
    }

    if (race.raceDistance <= 400) {
        initBlocks();
    }

    //Create Athlete models
    for (let id in msg.athletes) {
        let athleteResult = msg.athletes[id];
        let c = SkeletonUtils.clone(athleteGLTF.scene);
        let athlete = new Athlete(c, athleteGLTF.animations, athleteResult, id);

        race.athletes[id] = athlete;
        race.athletesList.push(athlete);
    }
    initLeaderboard();
    //TODO: Test 200m track hurdles
    if (race.hurdles) {
        allSpeedLines = true;
        let hurdleHeight, hurdle0, hurdleSpacing, hurdleCount;
        //TODO: slow down hurdle step

        if (race.eventName.includes('Men')) {
            if (race.eventName.includes('60') || race.eventName.includes('55')) {
                hurdleHeight = 1.067;
                hurdle0 = 13.72;
                hurdleSpacing = 9.14;
                hurdleCount = 5;
            }
            else if (race.eventName.includes('110')) {
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
            if (race.eventName.includes('60') || race.eventName.includes('55')) {
                hurdleHeight = 0.840;
                hurdle0 = 13.00;
                hurdleSpacing = 8.50;
                hurdleCount = 5;
            }
            else if (race.eventName.includes('100')) {
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

        //hurdles setTime
        //requires that time is in range [race.minTime, race.maxTime]
        race.setTime = (time, delta=0) => {
            time = time + delta;
            let msg = interpolateMsgs(time);

            //phase at hurdles should be 0.4 (based on run-cycle)
            //phase should roughly increase by 1 every 5.8m
            let phaseRatioStart = (Math.ceil(hurdle0 / 5.8 - 0.4) + 0.4) / hurdle0;
            let phaseRatio = Math.ceil(hurdleSpacing / 5.8) / hurdleSpacing;

            //Set dist, posTheta, call athlete.pose() with phase and hurdle arguments
            for (let id in race.athletes) {
                let athlete = race.athletes[id];
                let amsg = msg.athletes[id];

                athlete.dist = amsg.pathDistance;
                athlete.speed = amsg.speed;

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
                    // After race finish, line up in order of finish.
                    // Once results are official go to podiums.
                    if (!race.resultsOfficial) {
                        //line up in unofficial finish order
                        const finishTime = athlete.finishTime;
                        const finishSpeed = athlete.speed;
                        
                        const t = time - finishTime;
                        //TODO: this is a sudden stop to account for the 60m hurdles' short finish. 
                        // Should instead treat the 60m hurdles uniquely.
                        const rankStagger = athlete.rank === 1 ? 25 : (athlete.rank === 2 ? 19 : (athlete.rank === 3 ? 14 : (5 + 5*athlete.random)));

                        //quadratic curve with:
                        // m=finishSpeed @ t=0
                        // dist=rankStagger @ m=0
                        const d1 = rankStagger;
                        const b = finishSpeed;
                        const t1 = 2 * d1 / b;
                        const a = -b / (2 * t1);
                        const d = Math.max(0, a*t*t + b*t);

                        if (t < t1) {
                            athlete.dist = race.raceDistance + d;
                            let posTheta = race.f(athlete.lane, athlete.dist);
                            athlete.posTheta = posTheta;
                            athlete.pose(delta);
                        }
                        else {
                            athlete.dist = race.raceDistance + rankStagger;
                            let posTheta = race.f(athlete.lane, athlete.dist);
                            athlete.posTheta = posTheta;
                            athlete.pose(delta);
                        }
                    }
                    else {
                        //TODO: official results, go to podiums
                        
                    }
                }
                phase = pmod(phase, 1);
                posTheta.p.z += hurdle * (hurdleHeight - 0.840); //hurdle animation was animated at height 0.840, correct height of leap
                athlete.posTheta = posTheta;
                athlete.poseHurdle(delta, phase, hurdle);
            }

            race.time = time;
            race.athletesList.sort((b,a) => {
                if (a.dist < b.dist) return -1;
                else if (a.dist > b.dist) return 1;
                else return a.rank - b.rank;
            });

            rankLabels();
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
            for (let im of ims) {
                for (let i = 0; i < hurdleCount; i++) {
                    let dist = hurdle0 + i * hurdleSpacing;
                    for (let lane = 1; lane <= 9; lane++) {
                        let index = i*9 + lane-1;
                        let posTheta = race.f(lane, dist);
                        m.makeRotationFromEuler(new THREE.Euler(posTheta.phi ? posTheta.phi : 0, 0, posTheta.theta));
                        m.setPosition(posTheta.p.x, posTheta.p.y, posTheta.p.z);
                        im.setMatrixAt(index, m);
                        im.getMatrixAt(index, m);
                    }
                }
                im.instanceMatrix.needsUpdate = true;
            }
        });
    }
    else if (race.laned) {
        //Laned Races
        allSpeedLines = true;
        //laned races setTime
        //requires that time is in range [race.minTime, race.maxTime]
        race.setTime = (time, delta=0) => {
            time = time + delta;
            let msg = interpolateMsgs(time);

            //Set dist, posTheta for laned race
            for (let id in race.athletes) {
                let athlete = race.athletes[id];
                let amsg = msg.athletes[id];
                
                if (amsg.pathDistance < race.raceDistance) {
                    let posTheta = race.f(athlete.lane, amsg.pathDistance);
                    athlete.dist = amsg.pathDistance;
                    athlete.speed = amsg.speed;
                    athlete.finishTime = time;
                    athlete.posTheta = posTheta;
                    athlete.pose(delta);
                }
                else {
                    // After race finish, line up in order of finish.
                    // Once results are official go to podiums.
                    if (!race.resultsOfficial) {
                        //line up in unofficial finish order
                        const finishTime = athlete.finishTime;
                        const finishSpeed = athlete.speed;
                        
                        const t = time - finishTime;
                        const rankStagger = athlete.rank === 1 ? 50 : (athlete.rank === 2 ? 40 : (athlete.rank === 3 ? 30 : (10 + 5*athlete.random)));

                        //quadratic curve with:
                        // m=finishSpeed @ t=0
                        // dist=rankStagger @ m=0
                        const d1 = rankStagger;
                        const b = finishSpeed;
                        const t1 = 2 * d1 / b;
                        const a = -b / (2 * t1);
                        const d = Math.max(0, a*t*t + b*t);


                        if (t < t1) {
                            athlete.dist = race.raceDistance + d;
                            let posTheta = race.f(athlete.lane, athlete.dist);
                            athlete.posTheta = posTheta;
                            athlete.pose(delta);
                        }
                        else {
                            athlete.dist = race.raceDistance + rankStagger;
                            let posTheta = race.f(athlete.lane, athlete.dist);
                            athlete.posTheta = posTheta;
                            athlete.pose(delta);
                        }
                    }
                    else {
                        //TODO: official results, go to podiums
                        
                    }
                }
            }

            race.time = time;
            race.athletesList.sort((b,a) => {
                if (a.dist < b.dist) return -1;
                else if (a.dist > b.dist) return 1;
                else return a.rank - b.rank;
            });

            for (let i = 0; i < race.athletesList.length; i++) {
                race.athletesList[i].rank = i + 1;
            }
            
            rankLabels();
        }
    }
    else if (!race.laned) {
        //Un-laned races
        allSpeedLines = false;
        //unlaned setTime
        //requires that time is in range [race.minTime, race.maxTime]
        race.setTime = (time, delta=0) => {
            time = time + delta;
            let msg = interpolateMsgs(time);

            //Set dist, posTheta 
            //use x,y data for unlaned race
            for (let id in race.athletes) {
                let athlete = race.athletes[id];
                let amsg = msg.athletes[id];

                athlete.dist = amsg.pathDistance

                if (athlete.dist < race.raceDistance) {
                    athlete.speed = amsg.speed;
                    let posTheta = race.f(1, amsg.pathDistance);
                    posTheta.p = race.trackDataToGameTrack(amsg.x, amsg.y);
                    athlete.posTheta = posTheta;
                    athlete.pose(delta);
                }
                else {
                    //TODO: after race finish, line up in order of finish.
                    //Once results are official go to podiums.
                    if (!race.resultsOfficial) {
                        //line up in finish order
                        
                    }
                    else {
                        //go to podiums
                        
                    }
                }
            }

            race.time = time;
            race.athletesList.sort((b,a) => {
                if (a.dist < b.dist) return -1;
                else if (a.dist > b.dist) return 1;
                else return a.rank - b.rank;
            });

            rankLabels();
        }
    }
}

function rankLabels() {
    for (let i = 0; i < race.athletesList.length; i++) {
        let a = race.athletesList[i];
        a.rankEl.classList.remove('first');
        a.rankEl.classList.remove('second');
        a.rankEl.classList.remove('third');
        if (i === 0) {
            a.rankEl.classList.add('first');
        }
        else if (i === 1) {
            a.rankEl.classList.add('second');
        }
        else if (i === 2) {
            a.rankEl.classList.add('third');
        }
    }
}
    

function initBlocks() {
    gltfLoader.load('./models/blocks.glb', (gltf) => {
        let matBlock = new THREE.MeshPhongMaterial({ color: 0xC6C6C6 });
        let matTread = new THREE.MeshPhongMaterial({ color: 0x643624 });
        
        blockIMs = [];
        let imb, imt;
        for (let child of gltf.scene.children) {
            if (child.name === 'blocksMetal') {
                imb = new THREE.InstancedMesh(child.geometry.clone(), matBlock, race.athletesList.length);
                scene.add(imb);
                blockIMs.push(imb);
            }
            else if (child.name === 'blocksTreads') {
                imt = new THREE.InstancedMesh(child.geometry.clone(), matTread, race.athletesList.length);
                scene.add(imt);
                blockIMs.push(imt);
            }
        }
        let m = new THREE.Matrix4();
        m.identity();
        for (let im of blockIMs) {
            for (let i = 0; i < race.athletesList.length; i++) {
                let a = race.athletesList[i];
                let posTheta = race.f(a.lane, -0.358);
                m.makeRotationFromEuler(new THREE.Euler(posTheta.phi ? posTheta.phi : 0, 0, posTheta.theta));
                m.setPosition(posTheta.p.x, posTheta.p.y, posTheta.p.z);
                im.setMatrixAt(i, m);
                im.getMatrixAt(i, m);
            }
            im.instanceMatrix.needsUpdate = true;
        }
    });

    for (let a of race.athletesList) {
        let lane = a.lane;
        let {p, theta} = race.f(lane, 0);
        
    }
}

//find relevant race.msgs, interpolate them to create msg at race.time
//requires that time is in range [race.minTime, race.maxTime]
function interpolateMsgs(time) {
    let msg, msg0, msg1;
    let i = 0;
    //TODO: binary search by msg.time, or even better search out from previous index
    for (i = 0; i < race.msgs.length - 1; i++) {
        msg0 = race.msgs[i];
        if (msg0.raceTime <= time) {
            msg1 = race.msgs[i+1];
            if (time < msg1.raceTime) {
                let f = mapRange(time, msg0.raceTime,msg1.raceTime, 0,1);
                msg = {
                    fake: true,
                    athletes: {},
                    raceTime: time,
                }
                for (let id in msg0.athletes) {
                    let a0 = msg0.athletes[id];
                    let a1 = msg1.athletes[id];
                    msg.athletes[id] = {
                        pathDistance: mapRange(f, 0,1, a0.pathDistance, a1.pathDistance),
                        fromRail: mapRange(f, 0,1, a0.fromRail, a1.fromRail),
                        x: mapRange(f, 0,1, a0.x, a1.x),
                        y: mapRange(f, 0,1, a0.y, a1.y),
                        rank: a1.rank,
                        time: mapRange(f, 0,1, a0.time, a1.time), //TODO: stop sending this from server
                        speed: mapRange(f, 0,1, a0.speed, a1.speed),
                    };
                }
                break;
            }
        }
    }
    if (msg === undefined) {
        msg = race.msgs[race.msgs.length - 1];
    }

    return msg;
}

function updateRace(msg) {
    //TODO: detect bad messages more
    let badMSG = 0;
    for (let k in msg.athletes) {
        let a = msg.athletes[k];
        if ((a.x === a.y) || (a.x === -300)) {
            badMSG++;
        }
    }
    if (badMSG > race.athletesList.length / 2) return;

    let pmsg = race.msgs[race.msgs.length - 1];
    race.msgs.push(msg); 
    race.msgs.sort((a,b) => a.raceTime - b.raceTime);//TODO: insert into list instead of sorting
    race.minTime = Math.min(race.minTime, msg.raceTime);
    race.maxTime = Math.max(race.maxTime, msg.raceTime);
    let allFinished = true;
    for (let k in msg.athletes) {
        let athlete = race.athletes[k];
        let a = msg.athletes[k];
        let pa = pmsg.athletes[k];
        if (a.pathDistance < race.raceDistance) {
            allFinished = false;
        }
        //TODO: this currently doesn't work when you load the page in the middle of the race.
        // Could be solved in a complex way, or by loading the whole race from the server.
        for (let d = athlete.speeds.length; (d <= race.raceDistance) && (d <= a.pathDistance); d++) {
            let f = mapRange(d, pa.pathDistance,a.pathDistance, 0,1);
            f = Math.max(0,f);
            let speed = mapRange(f, 0,1, pa.speed,a.speed);
            athlete.speeds.push(speed);
            athlete.maxSpeed = Math.max(athlete.maxSpeed, speed);
            let pt;
            if (race.laned) {
                pt = race.f(a.lane, d).p;
            }
            else {
                pt = race.trackDataToGameTrack(
                    mapRange(f, 0,1, pa.x, a.x), 
                    mapRange(f, 0,1, pa.y, a.y)
                );
            }
            athlete.speedPoints.push(pt);
        }
    }
    if (allFinished) {
        race.maxTime = Infinity; //Full data that we're interested in is here, we can play the whole post-race animations
    }
}

init();

//TODO: test mobile compatibility
window.addEventListener('touchstart', (e) => {
    // prevent the window from scrolling
    e.preventDefault();
    mouse.x = e.touches[0].clientX * window.devicePixelRatio;
    mouse.y = e.touches[0].clientY * window.devicePixelRatio;
}, {passive: false});
   
window.addEventListener('touchmove', (e) => {
    mouse.x = e.touches[0].clientX * window.devicePixelRatio;
    mouse.y = e.touches[0].clientY * window.devicePixelRatio;
});
   
window.addEventListener('touchend', (e) => {
    mouse.x = -10;
    mouse.y = -10;
});


function onMouseMove(e) {
    mouse.x = e.clientX * window.devicePixelRatio, 
    mouse.y = e.clientY * window.devicePixelRatio;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize( window.innerWidth, window.innerHeight );
    rendererCSS.setSize( window.innerWidth, window.innerHeight );
}