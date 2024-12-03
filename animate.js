import { race, renderer, rendererCSS, scene, camera, picker, mouse, clock, helpers, LOADINGSTATES, PRELOAD, athleteParent } from './init.js';
import { cameraFunctions, cameraFunctionIndex } from './camera.js';

let shouldPickObject = (ob) => Boolean(ob.pickID);
let picked = null;

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

        cameraFunctions[cameraFunctionIndex]();

        for (let h of helpers) {
            h.update();
        }
    }
    else {
        //waiting for race data to come in

        cameraFunctions[0]();
    }
    

    renderer.render(scene, camera);
    rendererCSS.render(scene, camera);

    // shadowViewer.render(renderer);

    if (picked) {
        picked.unHighlight();
    }

    let pick = picker.pick(mouse.x, mouse.y, shouldPickObject);
    if (pick >= 0) {
        let id = pick.toString(16).padStart(8, '0').toUpperCase();
        console.log(id);
        picked = race.athletes[id].athleteModel;
        console.log(picked);
        picked.highlight();
    }
    else {
        picked = null;
    }
}