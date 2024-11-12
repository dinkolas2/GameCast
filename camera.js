import { camera, sunLight, race, controls } from './init.js';

import { pmod } from './util.js';

import * as THREE from 'three';

export let cameraFunctionIndex = 0;

export function setCameraFunctionIndex(v) {
    cameraFunctionIndex = pmod(v, cameraFunctions.length);
}

//MANUAL camera behavior:
//update with THREE.js OrbitControls
function setCameraManual() {
    controls.update();

    let p = controls.target;

    sunLight.position.set(p.x + 2, p.y - 2, 5);
    sunLight.target.position.set(p.x, p.y, 0);
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
        sumDist += race.athletesList[i].athleteModel.dist;
    }

    sumDist = sumDist / count;
    let pt = race.f(4.5, sumDist);
    let p = pt.p;

    let newPos = new THREE.Vector3(p.x - 25 * Math.cos(pt.theta + 0.5), p.y - 25 * Math.sin(pt.theta + 0.5), 10);
    camera.position.lerp(newPos, 0.005);
    //camera.position.set(p.x + 20, p.y - 10, 10);
    camera.lookAt(p.x, p.y, 1);

    sunLight.position.set(p.x + 2, p.y - 2, 5);
    sunLight.target.position.set(p.x, p.y, 0);
}

//FRAMING camera behavior:
// Angle of camera is fixed (could later be adjusted).
// Get position of first 4 athletes (could also be adjusted), imagine image plane 
// centered at their average position and orthogonal to view angle. 
// Project positions of athletes onto image plane, then postion the camera such
// that all athletes are in frame with some padding room.
//
// Good for unlaned races or back stretch, because otherwise it can be discontinuous
function setCameraFraming() {
    let cameraViewDirection = new THREE.Vector3(10,3,-5);
    cameraViewDirection.normalize();

    let sumX = 0, sumY = 0;
    let count = Math.min(race.athletesList.length, 4);
    let as = [];
    for (let i = 0; i < count; i++) {
        let v = race.athletesList[i].athleteModel.posTheta.p.clone();
        sumX += v.x;
        sumY += v.y;
        as.push(v);
    }

    const v0 = new THREE.Vector3(sumX / count, sumY / count, 0);
    //set camera position to plane origin
    camera.position.copy(v0);

    //set camera angle
    camera.lookAt(v0.x + cameraViewDirection.x, v0.y + cameraViewDirection.y, v0.z + cameraViewDirection.z);
    
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(camera.quaternion);
    up.applyQuaternion(camera.quaternion);

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
    xMin -= 1;
    yMin -= 1;
    xMax += 1;
    yMax += 3; // roughly height of athletes + 1m

    // width and height of plane space bounding box
    let xDist = xMax - xMin; 
    let yDist = yMax - yMin; 
    // center of plane space bounding box
    let xCenter = (xMax + xMin)/2;
    let yCenter = (yMax + yMin)/2;

    //camera starts at plane origin (v0)
    //move camera in plane coordinates to be centered on bounding box
    camera.position.add(right.multiplyScalar(xCenter));
    camera.position.add(up.multiplyScalar(yCenter));
    //light box centered on bounding box
    sunLight.position.set(camera.position.x + 2, camera.position.y - 2, 5);
    sunLight.target.position.set(camera.position.x, camera.position.y, 0);
    
    //move camera backwards to have whole bounding box in view
    let yFOV = 2 * Math.tan(camera.fov * Math.PI/180 / 2); //ratio of vertical view height / forwards view depth
    let xFOV = yFOV * camera.aspect; //ratio of horizontal view width / forwards view depth
    let dist = Math.max(
        xDist / xFOV,
        yDist / yFOV
    );
    camera.position.add(cameraViewDirection.multiplyScalar(-dist));
}

//FRAMEALL camera behavior:
// FRAMING but with all athletes
function setCameraFrameAll() {
    let cameraViewDirection = new THREE.Vector3(10,3,-5);
    cameraViewDirection.normalize();

    let sumX = 0, sumY = 0;
    let count = race.athletesList.length;
    let as = [];
    for (let i = 0; i < count; i++) {
        let v = race.athletesList[i].athleteModel.posTheta.p.clone();
        sumX += v.x;
        sumY += v.y;
        as.push(v);
    }

    const v0 = new THREE.Vector3(sumX / count, sumY / count, 0);
    //set camera position to plane origin
    camera.position.copy(v0);

    //set camera angle
    camera.lookAt(v0.x + cameraViewDirection.x, v0.y + cameraViewDirection.y, v0.z + cameraViewDirection.z);
    
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(camera.quaternion);
    up.applyQuaternion(camera.quaternion);

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
    xMin -= 1;
    yMin -= 1;
    xMax += 1;
    yMax += 3; // roughly height of athletes + 1m

    // width and height of plane space bounding box
    let xDist = xMax - xMin; 
    let yDist = yMax - yMin; 
    // center of plane space bounding box
    let xCenter = (xMax + xMin)/2;
    let yCenter = (yMax + yMin)/2;

    //camera starts at plane origin (v0)
    //move camera in plane coordinates to be centered on bounding box
    camera.position.add(right.multiplyScalar(xCenter));
    camera.position.add(up.multiplyScalar(yCenter));
    //light box centered on bounding box
    sunLight.position.set(camera.position.x + 2, camera.position.y - 2, 5);
    sunLight.target.position.set(camera.position.x, camera.position.y, 0);
    
    //move camera backwards to have whole bounding box in view
    let yFOV = 2 * Math.tan(camera.fov * Math.PI/180 / 2); //ratio of vertical view height / forwards view depth
    let xFOV = yFOV * camera.aspect; //ratio of horizontal view width / forwards view depth
    let dist = Math.max(
        xDist / xFOV,
        yDist / yFOV
    );
    camera.position.add(cameraViewDirection.multiplyScalar(-dist));
}

//BIRD'S EYE camera behavior:
//same as FRAMING except top down view direction that rotates, and frames all athletes
function setCameraBird() {
    let sumX = 0, sumY = 0, sumDist = 0;
    let count = race.athletesList.length;
    let as = [];
    for (let i = 0; i < count; i++) {
        let v = race.athletesList[i].athleteModel.posTheta.p.clone();
        sumX += v.x;
        sumY += v.y;
        sumDist += race.athletesList[i].athleteModel.dist;
        as.push(v);
    }

    let theta = race.f(4.5, sumDist / count).theta;
    
    let cameraViewDirection = new THREE.Vector3();
    if (camera.aspect > 1) {
        //horizontal camera
        cameraViewDirection.set(Math.cos(theta), Math.sin(theta), -3);
    }
    else {
        //vertical camera
        cameraViewDirection.set(Math.cos(theta - Math.PI/2), Math.sin(theta - Math.PI/2), -3);
    }
    cameraViewDirection.normalize();

    const v0 = new THREE.Vector3(sumX / count, sumY / count, 0);
    //set camera position to plane origin
    camera.position.copy(v0);

    //set camera angle
    camera.lookAt(v0.x + cameraViewDirection.x, v0.y + cameraViewDirection.y, v0.z + cameraViewDirection.z);
    
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(camera.quaternion);
    up.applyQuaternion(camera.quaternion);

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
    xMin -= 1;
    yMin -= 1;
    xMax += 1;
    yMax += 1;

    // width and height of plane space bounding box
    let xDist = xMax - xMin; 
    let yDist = yMax - yMin; 
    // center of plane space bounding box
    let xCenter = (xMax + xMin)/2;
    let yCenter = (yMax + yMin)/2;

    //camera starts at plane origin (v0)
    //move camera in plane coordinates to be centered on bounding box
    camera.position.add(right.multiplyScalar(xCenter));
    camera.position.add(up.multiplyScalar(yCenter));
    //light box centered on bounding box
    sunLight.position.set(camera.position.x + 2, camera.position.y - 2, 5);
    sunLight.target.position.set(camera.position.x, camera.position.y, 0);
    
    //move camera backwards to have whole bounding box in view
    let yFOV = 2 * Math.tan(camera.fov * Math.PI/180 / 2); //ratio of vertical view height / forwards view depth
    let xFOV = yFOV * camera.aspect; //ratio of horizontal view width / forwards view depth
    let dist = Math.max(
        xDist / xFOV,
        yDist / yFOV
    );
    camera.position.add(cameraViewDirection.multiplyScalar(-dist));
}

//TAILING camera behavior:
// fly above/behind first place athlete
function setCameraTailing() {
    let p = race.athletesList[0].athleteModel.posTheta.p;
    let theta = race.athletesList[0].athleteModel.posTheta.theta;

    camera.position.set(p.x - 20*Math.cos(theta - Math.PI/2), p.y - 20*Math.sin(theta - Math.PI/2), 5);
    camera.lookAt(p.x - 2*Math.cos(theta - Math.PI/2), p.y - 2*Math.sin(theta - Math.PI/2), 0);

    sunLight.position.set(p.x + 2, p.y - 2, 5);
    sunLight.target.position.set(p.x, p.y, 0);
}

export const cameraFunctions = [setCameraManual, setCameraTracking, setCameraFraming, setCameraBird, setCameraTailing, setCameraFrameAll];