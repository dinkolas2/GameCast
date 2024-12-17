import { race, renderer, rendererCSS, scene, camera, picker, mouse, clock, helpers, LOADINGSTATES, PRELOAD, athleteParent, leaderboardContainer } from './init.js';
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

        //sort athlete ranking divs
        // for (let a of race.athletesList) {
        //     a.first = a.rankEl.getBoundingClientRect().top;
        // }
        // leaderboardContainer.innerHTML = "";
        // for(let a of race.athletesList) {
        //     leaderboardContainer.appendChild(a.rankEl);
        // }
        // for (let a of race.athletesList) {
        //     a.last = a.rankEl.getBoundingClientRect().top;
        //     if (a.first !== a.last) {
        //         a.inv = a.first - a.last;
        //     }
        //     a.rankEl.style.transform = `translateY(${Math.floor(a.inv)}px)`;
        //     a.inv *= 0.9;
        // }
    }
}