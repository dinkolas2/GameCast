import * as THREE from 'three';
//import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

//import { ShadowMapViewer } from 'three/addons/utils/ShadowMapViewer.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import { Athlete } from './athlete.js';

import { results } from './results.js';

import { animate } from './animate.js';

import { getTrackPos100,getTrackPos200,getTrackPos400,getTrackPos800,getTrackPos1500, STATES } from './trackUtil.js';
import { mapRange } from './util.js';

import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";

const socket = io('http://localhost:8082');
socket.on('tracking', (msg) => {
    console.log(msg);
});

//rendering
export let camera, renderer;
export let clock;

//scene
export let scene;

//light
export let sunLight;
export let envLight;

//misc
//export let controls;
export const helpers = [];
export let shadowViewer;

//materials
//import { trackShader } from './shaders/trackShader.js';
//export let matTrack;
export let matSkin;

//loaders
const gltfLoader = new GLTFLoader();

export let loaded = 0;
export const fullyLoaded = 3;

//race
export let race;

function init() {
    loaded = 0;

    initRender();
    initLights();
    initTrack();
    initRace();

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

    // controls = new OrbitControls( camera, renderer.domElement );
    // controls.target.set( 0, 2, 0 );
    // controls.update();

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
    // scene.add(h);
    helpers.push(h);
    h = new THREE.CameraHelper( sunLight.shadow.camera );
    // scene.add(h);

    // shadowViewer = new ShadowMapViewer(sunLight);
    // shadowViewer.position.x = 10;
    // shadowViewer.position.y = 10;
    // shadowViewer.size.width = 200;
    // shadowViewer.size.width = 200;
    // shadowViewer.update();
    // shadowViewer.updateForWindowResize();

    // console.log(sunLight);
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
        loaded++;
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
        loaded++;
    });
}

function initRace() {
    //race basics
    race = {
        state: STATES.MARK,
        athletes: [],
    };

    //Import athlete model, clone it for every athlete in the race
    matSkin = new THREE.MeshPhongMaterial({ color: 0x2B2F40 });
    //objects
    //import athlete model, clone it for each athlete, 
    //apply unique material to each one
    gltfLoader.load('./models/athlete2.glb', (gltf) => {
        console.log(gltf);
        for (let athleteResult of results.athletes) {
            let c = SkeletonUtils.clone(gltf.scene);
            let athleteModel = new Athlete(c, gltf.animations, athleteResult);
            athleteModel.race = race;

            let athlete = {
                athleteModel,
                lane: athleteResult.lane,
                reactionTime: athleteResult.reactionTime,
                splits: athleteResult.splits,
                time: athleteResult.time,
            };
            race.athletes.push(athlete);
        }
        loaded++;
    });

    if (results.race === '100m') {
        race.totalDist = 100;
        race.f = getTrackPos100;
        
    }
    else if (results.race === '200m') {
        race.totalDist = 200;
        race.f = getTrackPos200;
    }
    else if (results.race === '400m') {
        race.totalDist = 400;
        race.f = getTrackPos400;
    }
    else if (results.race === '800m') {
        race.totalDist = 800;
        race.f = getTrackPos800;
    }
    else if (results.race === '1500m') {
        race.totalDist = 1500;
        race.f = getTrackPos1500;
    }

    if (results.race === '100m' || results.race === '200m' || results.race === '400m') {
        race.setTime = (raceTime, delta) => {
            //sort first place first, second place second, etc
            race.athletes.sort((a,b) => b.athleteModel.dist - a.athleteModel.dist);
            for (let athlete of race.athletes) {
                let athleteModel = athlete.athleteModel;
                let dist;

                if (raceTime < athlete.reactionTime) {
                    dist = 0;
                }
                else if (raceTime < athlete.time) {
                    if (raceTime < athlete.splits[0].time) {
                        dist = mapRange(raceTime, athlete.reactionTime,athlete.splits[0].time, 0,athlete.splits[0].dist);
                    }
                    else {
                        for (let i = 0; i < athlete.splits.length-1; i++) {
                            let split0 = athlete.splits[i];
                            let split1 = athlete.splits[i+1];
                            if (split0.time <= raceTime && raceTime <= split1.time) {
                                dist = mapRange(raceTime, split0.time,split1.time, split0.dist,split1.dist);
                            }
                        }
                    }
                    
                    if (dist === undefined) {
                        dist = mapRange(raceTime, athlete.splits[athlete.splits.length - 1].time,athlete.time, athlete.splits[athlete.splits.length - 1].dist,race.totalDist);
                    }
                }
                else {
                    dist = race.totalDist + 10 - 10/(1 + raceTime - athlete.time);
                }
                let posTheta = race.f(athlete.lane, dist);
                athleteModel.dist = dist;
                athleteModel.posTheta = posTheta;

                athleteModel.pose(raceTime, delta);
            }
        }
    }
    else if (results.race === '800m' || results.race === '1500m') {
        race.setTime = (raceTime, delta) => {
            for (let athlete of race.athletes) {
                let athleteModel = athlete.athleteModel;
                let dist;

                if (raceTime < athlete.reactionTime) {
                    dist = 0;
                }
                else if (raceTime < athlete.time) {
                    if (raceTime < athlete.splits[0].time) {
                        dist = mapRange(raceTime, athlete.reactionTime,athlete.splits[0].time, 0,athlete.splits[0].dist);
                    }
                    else {
                        for (let i = 0; i < athlete.splits.length-1; i++) {
                            let split0 = athlete.splits[i];
                            let split1 = athlete.splits[i+1];
                            if (split0.time <= raceTime && raceTime <= split1.time) {
                                dist = mapRange(raceTime, split0.time,split1.time, split0.dist,split1.dist);
                            }
                        }
                    }
                    
                    if (dist === undefined) {
                        dist = mapRange(raceTime, athlete.splits[athlete.splits.length - 1].time,athlete.time, athlete.splits[athlete.splits.length - 1].dist,race.totalDist);
                    }
                }
                else {
                    dist = race.totalDist + 10 - 10/(1 + raceTime - athlete.time);
                }
                
                athleteModel.dist = dist;
            }
            
            //initialize offset based on order, pass on the outside
            //sort first place first, second place second, etc
            race.athletes.sort((a,b) => b.athleteModel.dist - a.athleteModel.dist);
            for (let i = 0; i < race.athletes.length; i++) {
                let a = race.athletes[i].athleteModel;
                a.offset += i*0.01;
                let posTheta = race.f(race.athletes[i].lane, a.dist);
                a.posTheta = posTheta;
                let {p, theta} = posTheta;
                a.x = p.x + a.offset * Math.cos(theta+Math.PI);
                a.y = p.y + a.offset * Math.sin(theta+Math.PI);
            }
            //physics sim to refine offsets
            for (let i = 0; i < 20; i++) {
                for (let i = 0; i < race.athletes.length; i++) {
                    let a = race.athletes[i].athleteModel;
                    for (let j = 0; j < i; j++) {
                        let b = race.athletes[j].athleteModel;
                        let d = Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2);
                        const minD = 0.75;
                        if (d < minD) {
                            let dd = 2*mapRange(1/(0.01+d), 100,1/(minD + 0.01), minD,0);
                            if (a.offset < b.offset) {
                                a.offset -= dd;
                                b.offset += dd;
                            }
                            else {
                                a.offset += dd;
                                b.offset -= dd;
                            }
                        }
                    }
                }
                for (let i = 0; i < race.athletes.length; i++) {
                    let a = race.athletes[i].athleteModel;
                    a.offset = Math.max(0, a.offset);
                    a.offset *= 0.99;
                    let {p, theta} = a.posTheta;
                    a.x = p.x + a.offset * Math.cos(theta+Math.PI);
                    a.y = p.y + a.offset * Math.sin(theta+Math.PI);
                }
            }
            

            for (let athlete of race.athletes) {
                let a = athlete.athleteModel;
                a.soffset = 0.9*a.soffset + 0.1*a.offset;
                a.pose(raceTime, delta);
            }
        }
    }
}

init();

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize( window.innerWidth, window.innerHeight );
}