import { race, renderer, scene, camera,  clock, helpers, LOADINGSTATES, PRELOAD } from './init.js';
import { cameraFunctions, cameraFunctionIndex } from './camera.js';

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

    // shadowViewer.render(renderer);
}