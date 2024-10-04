import {race, renderer, scene, camera, sunLight, clock, loaded, fullyLoaded, helpers} from './init.js';

import { mapRange, mapRangeClamp } from './util.js';

import { STATES } from './trackUtil.js';

//import * as THREE from 'three';

let seg = -1;

let raceState = STATES.MARK;
let raceTime = 0;

export function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const t = clock.elapsedTime;

    if (loaded < fullyLoaded) {
        //wait for all assets to load and initialize
        return;
    }

    race.setTime(t-2);
    
    let sumDist = 0;
    let topN = Math.min(race.athletes.length, 4);
    for (let i = 0; i < topN; i++) {
        let athlete = race.athletes[i];
        let dist = athlete.athleteModel.dist;
        sumDist += dist;
    }

    let {p, theta} = race.f(4.5, sumDist/topN);

    camera.position.set(p.x + 20, p.y - 10, 10);
    camera.lookAt(p.x,p.y,1);

    sunLight.position.set(p.x + 2, p.y - 2, 5);
    sunLight.target.position.set(p.x, p.y, 0);
    
    //controls.update();

    for (let h of helpers) {
        h.update();
    }

    renderer.render(scene, camera);

    // shadowViewer.render(renderer);
}