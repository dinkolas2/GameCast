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
//position of camera is riding on a track that goes around the outside of the whole oval
//select first 4 athletes
//
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

//BIRD'S EYE camera behavior:

//TAILING camera behavior:

export const cameraFunctions = [setCameraManual, setCameraTracking];