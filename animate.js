import {race, renderer, scene, camera, sunLight, clock, helpers, LOADINGSTATES, PRELOAD, controls} from './init.js';

//import * as THREE from 'three';

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
        let sumX = 0;
        let sumY = 0;
        let count = 0;
        for (let id in race.athletes) {
            sumX += race.athletes[id].athleteModel.posTheta.p.x;
            sumY += race.athletes[id].athleteModel.posTheta.p.y;
            count++;
        }

        sumX = sumX / count;
        sumY = sumY / count;
    
        camera.position.set(sumX + 20, sumY - 10, 10);
        camera.lookAt(sumX, sumY, 1);
    
        sunLight.position.set(sumX + 2, sumY - 2, 5);
        sunLight.target.position.set(sumX, sumY, 0);
        
        // controls.update();
    
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