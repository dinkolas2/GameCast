import {race, renderer, scene, camera, sunLight, clock, helpers, LOADINGSTATES, PRELOAD, controls} from './init.js';

//import * as THREE from 'three';

const MANUALCAMERA = false;

export function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (race) {
        if (race.loadingState === LOADINGSTATES.INIT) {
            race.setTime(race.time);
            if (race.maxTime >= race.time + PRELOAD) {
                race.loadingState = LOADINGSTATES.PLAYING;
            }
            else {
                race.loadingState = LOADINGSTATES.AWAITING;
            }
        }
        else if (race.loadingState === LOADINGSTATES.AWAITING) {
            if (race.maxTime >= race.time + delta + PRELOAD) {
                race.loadingState = LOADINGSTATES.PLAYING;
                race.setTime(race.time + delta);
            }
        }
        else if (race.loadingState === LOADINGSTATES.PLAYING) {
            if (race.maxTime >= race.time + delta) {
                race.setTime(race.time + delta);
            }
            else {
                race.loadingState = LOADINGSTATES.AWAITING;
            }
        }
        
        //set camera
        let sumDist = 0;
        let count = Math.min(race.athletesList.length, 4);
        for (let i = 0; i < count; i++) {
            sumDist += race.athletesList[i].athleteModel.dist;
        }

        sumDist = sumDist / count;
        let p = race.f(4.5, sumDist).p;
    
        if (MANUALCAMERA) {
            controls.update();
        }
        else {
            camera.position.set(p.x + 20, p.y - 10, 10);
            camera.lookAt(p.x, p.y, 1);
        }
    
        sunLight.position.set(p.x + 2, p.y - 2, 5);
        sunLight.target.position.set(p.x, p.y, 0);
    
        for (let h of helpers) {
            h.update();
        }
    }
    else {
        camera.position.set(10,10,10);
        camera.lookAt(0,0,0);
    }
    

    renderer.render(scene, camera);

    // shadowViewer.render(renderer);
}