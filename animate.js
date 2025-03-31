import { race, renderer, rendererCSS, scene, camera, autoCam, picker, mouse, clock, helpers, LOADINGSTATES, PRELOAD, athleteParent, leaderboardContainer, blockIMs, is200mTrack } from './init.js';
import { cameraFunctions, cameraFunctionIndex, setCameraFunctionIndex } from './camera.js';
import { pmod } from './util.js';

let shouldPickObject = (ob) => Boolean(ob.pickID);
let picked = null;

//0setCameraManual, 1setCameraTracking, 2setCameraFraming, 3setCameraBird, 4setCameraTailing, 5setCameraFrameAll, 6setCameraLeading, 7setCameraRevolveTrack
const revolvingCamIdces = [1,2,3,4,5,6];

export function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    if (race) {
        let d = race.athletesList[0].dist;
        if (d > (is200mTrack ? 100 : 200) && blockIMs && blockIMs[0].visible) {
            for (let blockIM of blockIMs) {
                //hide blocks
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

        if (autoCam) {
            const remaining = race.raceDistance - d;
            const straightaway = (is200mTrack ? 50 : 100);
            
            //0setCameraManual, 1setCameraTracking, 2setCameraFraming, 3setCameraBird, 4setCameraTailing, 5setCameraFrameAll, 6setCameraLeading, 7setCameraRevolveTrack
            if (race.raceDistance <= 100) {
                setCameraFunctionIndex(5);
            }
            else if (remaining <= 0) {
                // ended
                setCameraFunctionIndex(6);
            }
            else if (remaining < straightaway) {
                //last straightaway
                setCameraFunctionIndex(1);
            }
            else {
                let idx = revolvingCamIdces[pmod(Math.floor((remaining - straightaway) / 100), revolvingCamIdces.length)];
                setCameraFunctionIndex(idx);
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