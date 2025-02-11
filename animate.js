import { race, renderer, rendererCSS, scene, camera, picker, mouse, clock, helpers, LOADINGSTATES, PRELOAD, athleteParent, leaderboardContainer, blockIMs, is200mTrack } from './init.js';
import { cameraFunctions, cameraFunctionIndex } from './camera.js';
import { mapRange } from './util.js';

let shouldPickObject = (ob) => Boolean(ob.pickID);
let picked = null;

export function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    if (race) {
        if (race.athletesList[0].dist > (is200mTrack ? 100 : 200) && blockIMs && blockIMs[0].visible) {
            for (let blockIM of blockIMs) {
                blockIM.visible = false;
            }
        }
        if (race.loadingState === LOADINGSTATES.INIT) {
            race.setTime(race.time, delta);
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
                race.setTime(race.time, delta);
            }
        }
        else if (race.loadingState === LOADINGSTATES.PLAYING) {
            if (race.maxTime >= race.time + delta) {
                race.setTime(race.time, delta);
            }
            else {
                race.loadingState = LOADINGSTATES.AWAITING;
            }
        }

        cameraFunctions[cameraFunctionIndex](time);

        for (let h of helpers) {
            h.update();
        }
    }
    else {
        //waiting for race data to come in
        //camera flies around, screen saver style
        cameraFunctions[7](time);
    }

    renderer.render(scene, camera);
    rendererCSS.render(scene, camera);

    if (race) {
        //mouse hover highlight athletes GPU picking
        let pick = picker.pick(mouse.x, mouse.y, shouldPickObject);
        if (pick >= 0) {
            for (let athlete of race.athletesList) {
                athlete.unHighlight();
            }
            let id = pick.toString(16).padStart(8, '0').toUpperCase();
            picked = race.athletes[id];
            picked.highlight();
        }
        else {
            picked = null;
        }
    }
}