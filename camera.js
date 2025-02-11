import { camera, sunLight, race, controls, is200mTrack } from './init.js';

import { pmod, mapRange } from './util.js';

import * as THREE from 'three';

export let cameraFunctionIndex = 0;
let indexChanged = true;

export function setCameraFunctionIndex(v) {
    indexChanged = true;
    cameraFunctionIndex = pmod(v, cameraFunctions.length);
}

const tempV3_1 = new THREE.Vector3();
const tempV3_2 = new THREE.Vector3();
const tempV3_3 = new THREE.Vector3();
const tempOb = new THREE.Object3D();
tempOb.up.set(0,0,1);
const padding = {left: 0, right: 0, top: 0, bottom: 0};
const cameraViewDirection = new THREE.Vector3();

//camera flies around, screen saver style
function setCameraRevolve200mTrack(time) {
    if (time % 25 < 10) {
        camera.position.set(-24 + 75*Math.cos(time%25 * Math.PI/5), 17 + 40*Math.sin(time%25 * Math.PI/5), 10);
        camera.lookAt(-24, 17, 0);
    }
    else if (time % 25 < 15) {
        camera.position.set(mapRange(time%25, 10,15, -60,4), -10, 10);
        camera.lookAt(mapRange(time%25, 10,15, -40,4), 0, 0);
    }
    else if (time % 25 < 20) {
        camera.position.set(mapRange(time%25, 15,20, 20,-55), 17, 1);
        camera.lookAt(mapRange(time%25, 15,20, 12,-70), 17, 0);
    }
    else {
        camera.position.set(-24, 0, mapRange(time%25, 20,25, 40,100));
        camera.lookAt(-24, 14, 0);
    }
}
//camera flies around, screen saver style
function setCameraRevolve400mTrack(time) {
    if (time % 25 < 10) {
        camera.position.set(-39 + 80*Math.cos(time%25 * Math.PI/5), -42 + 120*Math.sin(time%25 * Math.PI/5), 10);
        camera.lookAt(-39, -42, 0);
    }
    else if (time % 25 < 15) {
        camera.position.set(mapRange(time%25, 10,15, -86,-55), mapRange(time%25, 10,15, -86,-135), 20);
        camera.lookAt(mapRange(time%25, 10,15, -85,-54), mapRange(time%25, 10,15, -85,-125), 0);
    }
    else if (time % 25 < 20) {
        camera.position.set(-85, mapRange(time%25, 15,20, 35,-100), 2);
        camera.lookAt(-85, mapRange(time%25, 15,20, 31,-115), 0);
    }
    else {
        camera.position.set(-60, -42, mapRange(time%25, 20,25, 80,200));
        camera.lookAt(-45, -42, 0);
    }    
}
function setCameraRevolveTrack(time) {
    if (indexChanged) {
        camera.fov = 45;
        camera.updateProjectionMatrix();
    }
    
    if (is200mTrack) {
        setCameraRevolve200mTrack(time);
    }
    else {
        setCameraRevolve400mTrack(time);
    }

    indexChanged = false;
}

//MANUAL camera behavior:
//update with THREE.js OrbitControls
function setCameraManual() {
    if (indexChanged) {
        camera.fov = 20;
        camera.updateProjectionMatrix();
    }

    controls.update();

    let p = controls.target;

    sunLight.position.set(p.x + 2, p.y - 2, 5);
    sunLight.target.position.set(p.x, p.y, 0);
    indexChanged = false;
}

//TRACKING camera behavior:
// Position of camera is riding on a track that goes around the outside of 
// the whole oval. Select first 4 athletes, average their distance in the race, 
// and point the camera at lane 4.5 at that distance in the race.
//
// eh not great
function setCameraTracking() {
    let sumDist = 0;
    let count = Math.min(race.athletesList.length, 4);
    for (let i = 0; i < count; i++) {
        sumDist += race.athletesList[i].dist;
    }

    sumDist = sumDist / count;
    let pt = race.f(4.5, sumDist);
    let p = pt.p;

    let newPos = new THREE.Vector3(p.x - 25 * Math.cos(pt.theta + 0.5), p.y - 25 * Math.sin(pt.theta + 0.5), 10);
    if (indexChanged) {
        camera.position.copy(newPos);
        camera.fov = 20;
        camera.updateProjectionMatrix();
    }
    else {
        camera.position.lerp(newPos, 0.005);
    }
    //camera.position.set(p.x + 20, p.y - 10, 10);
    camera.lookAt(p.x, p.y, 1);

    sunLight.position.set(p.x + 2, p.y - 2, 5);
    sunLight.target.position.set(p.x, p.y, 0);
    indexChanged = false;
}

//FRAMING camera behavior:
// Angle of camera is fixed (could later be adjusted).
// Get position of first 3 athletes (could also be adjusted), imagine image plane 
// centered at their average position and orthogonal to view angle. 
// Project positions of athletes onto image plane, then postion the camera such
// that all athletes are in frame with some padding room.
//
// Good for unlaned races or back stretch, because otherwise it can be discontinuous
function setCameraFraming() {
    cameraViewDirection.set(10,3,-5);
    padding.left = 1;
    padding.right = 1;
    padding.bottom = 1;
    padding.top = 3; //2 + height of athletes roughly 2m

    if (indexChanged) {
        camera.fov = 5;
        camera.updateProjectionMatrix();
    }
     
    const pos = setCameraFrameNFromView(Math.min(3, race.athletesList.length), cameraViewDirection, padding);

    if (indexChanged) {
        camera.position.set(pos.x,pos.y,pos.z);
    }
    else {
        camera.position.lerp(pos, 0.1);
    }
    
    camera.lookAt(camera.position.x + cameraViewDirection.x, camera.position.y + cameraViewDirection.y, camera.position.z + cameraViewDirection.z);
    indexChanged = false;
}

//FRAMEALL camera behavior:
// FRAMING but with all athletes
function setCameraFrameAll() {
    cameraViewDirection.set(10,3,-5);
    padding.left = 2;
    padding.right = 2;
    padding.bottom = 2;
    padding.top = 4; //2 + height of athletes roughly 2m

    if (indexChanged) {
        camera.fov = 5;
        camera.updateProjectionMatrix();
    }
    
    const pos = setCameraFrameNFromView(race.athletesList.length, cameraViewDirection, padding);

    camera.position.set(pos.x, pos.y, pos.z);
    camera.lookAt(camera.position.x + cameraViewDirection.x, camera.position.y + cameraViewDirection.y, camera.position.z + cameraViewDirection.z);
    indexChanged = false;
}

//BIRD'S EYE camera behavior:
//same as FRAMING except top down view direction that rotates, and frames all athletes
function setCameraBird() {
    let sumX = 0, sumY = 0, sumDist = 0, sumTheta = 0, t0 = race.athletesList[0].posTheta.theta;
    let count = race.athletesList.length;
    let as = [];
    for (let i = 0; i < count; i++) {
        let v = race.athletesList[i].posTheta.p.clone();
        sumX += v.x;
        sumY += v.y;
        sumDist += race.athletesList[i].dist;
        as.push(v);
        let t = race.athletesList[i].posTheta.theta;
        if (t0 - t > Math.PI) {
            t += Math.PI * 2;
        }
        else if (t0 - t < -Math.PI) {
            t -= Math.PI * 2;
        }
        sumTheta += t;
    }

    let theta = sumTheta/count; //race.f(1, sumDist / count).theta;
    
    if (camera.aspect > 1) {
        //horizontal camera
        cameraViewDirection.set(Math.cos(theta), Math.sin(theta), -3);
    }
    else {
        //vertical camera
        cameraViewDirection.set(Math.cos(theta - Math.PI/2), Math.sin(theta - Math.PI/2), -3);
    }
    
    padding.left = 2;
    padding.right = 2;
    padding.top = 2;
    padding.bottom = 2;
    const pos = setCameraFrameNFromView(count, cameraViewDirection, padding);

    camera.position.set(pos.x, pos.y, pos.z);
    camera.lookAt(camera.position.x + cameraViewDirection.x, camera.position.y + cameraViewDirection.y, camera.position.z + cameraViewDirection.z);
    indexChanged = false;
}

//TAILING camera behavior:
// fly above/behind first place athlete
function setCameraTailing() {
    let c0 = new THREE.Vector3().copy(camera.position);

    let p = race.athletesList[0].posTheta.p;
    let theta = race.athletesList[0].posTheta.theta;

    camera.position.set(p.x - 20*Math.cos(theta - Math.PI/2), p.y - 20*Math.sin(theta - Math.PI/2), 5);
    camera.lookAt(p.x - 2*Math.cos(theta - Math.PI/2), p.y - 2*Math.sin(theta - Math.PI/2), 0);

    sunLight.position.set(p.x + 2, p.y - 2, 5);
    sunLight.target.position.set(p.x, p.y, 0);

    if (!indexChanged) {
        camera.position.lerp(c0, 0.9);
        camera.fov = 20;
        camera.updateProjectionMatrix();
    }
    indexChanged = false;
}

//LEADING camera behavior:
// fly above/in front first place athlete
function setCameraLeading() {
    let c0 = new THREE.Vector3().copy(camera.position);

    let p = race.athletesList[0].posTheta.p;
    let theta = race.athletesList[0].posTheta.theta;

    camera.position.set(p.x - 10*Math.cos(theta + Math.PI/2), p.y - 10*Math.sin(theta + Math.PI/2), 5);
    camera.lookAt(p.x + 8*Math.cos(theta + Math.PI/2), p.y + 8*Math.sin(theta + Math.PI/2), 0);

    sunLight.position.set(p.x + 2, p.y - 2, 5);
    sunLight.target.position.set(p.x, p.y, 0);

    if (!indexChanged) {
        camera.position.lerp(c0, 0.9);
        camera.fov = 20;
        camera.updateProjectionMatrix();
    }
    indexChanged = false;
}

function setCameraFrameNFromView(n, cameraViewDirection, padding) {
    cameraViewDirection.normalize();

    let sumX = 0, sumY = 0;
    let count = Math.min(race.athletesList.length, n);
    let as = [];
    for (let i = 0; i < count; i++) {
        //TODO: inefficient lots of creating objects
        let v = race.athletesList[i].posTheta.p.clone();
        sumX += v.x;
        sumY += v.y;
        as.push(v);
    }

    let v0 = tempV3_1.set(sumX / count, sumY / count, 0);
    //set camera position to plane origin
    tempOb.position.copy(v0);

    //set camera angle
    tempOb.lookAt(v0.x + cameraViewDirection.x, v0.y + cameraViewDirection.y, v0.z + cameraViewDirection.z);
    
    //get camera right (x+) and up (z+) vectors from camera's perspective
    let up = tempV3_2.set(0, 1, 0);
    let right = tempV3_3.set(1, 0, 0);
    right.applyQuaternion(tempOb.quaternion);
    up.applyQuaternion(tempOb.quaternion);

    //get bounding rectangle in plane space
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    for (let a of as) {
        //origin of plane space is average of athletes
        a.sub(v0);
        //project athlete onto plane
        a.projectOnPlane(cameraViewDirection);
        //plane space right and up
        let px = right.dot(a);
        let py = up.dot(a);
        xMin = Math.min(xMin, px);
        xMax = Math.max(xMax, px);
        yMin = Math.min(yMin, py);
        yMax = Math.max(yMax, py);
    }

    //TODO: revisit left/right/top/bottom padding. Should this be in meters, pixels, etc?
    //Should do camera view offset to accomodate left leaderboard panel?
    xMin -= padding.left;
    yMin -= padding.bottom;
    xMax += padding.right;
    yMax += padding.top;
    xMax += (xMax - xMin) * 150 / window.innerWidth;

    // width and height of plane space bounding box
    let xDist = xMax - xMin; 
    let yDist = yMax - yMin; 
    // center of plane space bounding box
    let xCenter = (xMax + xMin)/2;
    let yCenter = (yMax + yMin)/2;

    //camera starts at plane origin (v0's position)
    //move camera in plane coordinates to be centered on bounding box
    tempOb.position.add(right.multiplyScalar(xCenter));
    tempOb.position.add(up.multiplyScalar(yCenter));
    //light box centered on bounding box
    sunLight.position.set(tempOb.position.x + 4, tempOb.position.y - 4, 10);
    sunLight.target.position.set(tempOb.position.x, tempOb.position.y, 0);
    
    //move camera backwards to have whole bounding box in view
    let yFOV = 2 * Math.tan(camera.fov * Math.PI/180 / 2); //ratio of vertical view height / forwards view depth
    let xFOV = yFOV * camera.aspect; //ratio of horizontal view width / forwards view depth
    let dist = Math.max(
        xDist / xFOV,
        yDist / yFOV
    );
    tempOb.position.addScaledVector(cameraViewDirection, -dist);

    tempV3_1.copy(tempOb.position);

    return tempV3_1;
}

export const cameraFunctions = [setCameraManual, setCameraTracking, setCameraFraming, setCameraBird, setCameraTailing, setCameraFrameAll, setCameraLeading, setCameraRevolveTrack];