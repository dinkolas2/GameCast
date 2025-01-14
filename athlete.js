import * as THREE from 'three';
import { race, athleteParent, matSkin } from './init.js';

import { mapRange, pmod } from './util.js';

export class Athlete {
    constructor (athleteScene, animations, athleteInfo, id) {
        this.firstName = athleteInfo.firstName;
        this.lastName = athleteInfo.lastName;
        this.lane = athleteInfo.lane;
        this.random = Math.random(); // per athlete randomness
        this.pickID = Number('0x'+id); // for mouse hover GPU picking

        this.scene = athleteScene;
        this.mixer = new THREE.AnimationMixer(this.scene);
        this.animations = animations;
        this.actions = {};
        for (let animation of this.animations) {
            if (animation.name === 'sprint_5.8') {
                this.actions.sprint = this.mixer.clipAction(animation);
                this.actions.sprint.play();
            }
            else if (animation.name === 'lowsprint_2.5') {
                this.actions.lowsprint = this.mixer.clipAction(animation);
                this.actions.lowsprint.play();
            }
            else {
                this.actions[animation.name] = this.mixer.clipAction(animation);
                this.actions[animation.name].play();
            }
        }

        this.armature = this.scene.children[0];
        this.body = this.armature.children[3];

        //default random colors
        let color1 = new THREE.Color( Math.random(),Math.random(),Math.random() );
        let color2 = new THREE.Color( Math.random(),Math.random(),Math.random() );
        
        //TODO: replace with known colors if data is good
        // if (athleteInfo) {
        //     if (athleteInfo.color1) {
        //         color1.set(athleteInfo.color1.r, athleteInfo.color1.g, athleteInfo.color1.b);
        //     }
        //     if (athleteInfo.color2) {
        //         color2.set(athleteInfo.color2.r, athleteInfo.color2.g, athleteInfo.color2.b);
        //     }
        // }
        this.matCol1 = new THREE.MeshPhongMaterial({ transparent: true, color: color1 });
        this.matCol1.castShadow = true;
        this.matCol1.receiveShadow = true;
        this.matCol2 = new THREE.MeshPhongMaterial({ transparent: true, color: color2 });
        this.matCol2.castShadow = true;
        this.matCol2.receiveShadow = true;

        for (let child of this.armature.children) {
            //find meshes in children of armature
            if (child.name === 'geoCol1') {
                child.material = this.matCol1;
                child.castShadow = true;
                child.receiveShadow = true;
                this.meshCol1 = child;
                this.meshCol1.pickID = this.pickID;
                this.meshCol1.frustumCulled = false; //with the Skeleton it was sometimes getting culled incorrectly
            }
            else if (child.name === 'geoCol2') {
                child.material = this.matCol2; 
                child.castShadow = true;
                child.receiveShadow = true;
                this.meshCol2 = child;
                this.meshCol2.pickID = this.pickID;
                this.meshCol2.frustumCulled = false;
            }
            else if (child.name === 'geoSkin') {
                child.material = matSkin.clone();
                child.castShadow = true;
                child.receiveShadow = true;
                this.meshSkin = child;
                this.meshSkin.pickID = this.pickID;
                this.meshSkin.frustumCulled = false;
            }
        }

        athleteParent.add(this.scene);

        this._posTheta = {
            p: new THREE.Vector3(),
            theta: 0,
        }
        this.pposTheta = {
            p: new THREE.Vector3(),
            theta: 0,
        }
        this._dist = 0;

        //morph targets for gender
        if (race.eventName.includes('Women')) {
            this.meshCol1.morphTargetInfluences[0] = 0;
            this.meshCol2.morphTargetInfluences[0] = 0;
            this.meshSkin.morphTargetInfluences[0] = 0;
        }
        else {
            this.meshCol1.morphTargetInfluences[0] = 1;
            this.meshCol2.morphTargetInfluences[0] = 1;
            this.meshSkin.morphTargetInfluences[0] = 1;
        }
    }

    get dist() {
        return this._dist;
    }

    set dist(d) {
        this.pdist = this._dist;
        this._dist = d;
    }

    get posTheta() {
        return this._posTheta;
    }

    set posTheta(posTheta) {
        this.pposTheta = this._posTheta;
        this._posTheta = posTheta;
    }

    highlight() {
        this.labelObjectVisible = 1;
        this.labelObject.visible = true;
        this.rankEl.classList.add('highlight');

        for (let a of race.athletesList) {
            if (this !== a) {
                a.meshCol1.material.opacity = 0.5;
                a.meshCol2.material.opacity = 0.5;
                a.meshSkin.material.opacity = 0.5;
            }
            else {
                a.meshCol1.material.opacity = 1;
                a.meshCol2.material.opacity = 1;
                a.meshSkin.material.opacity = 1;
            }
        }
    }

    unHighlight() {
        this.labelObjectVisible = 0;
        this.labelObject.visible = false;
        this.rankEl.classList.remove('highlight');

        for (let a of race.athletesList) {
            a.meshCol1.material.opacity = 1;
            a.meshCol2.material.opacity = 1;
            a.meshSkin.material.opacity = 1;
        }
    }

    pose(phase = null, hurdle = 0) {
        //TODO: better visibility control of labels
        this.labelObjectVisible *= 0.999;
        if (0 < this.labelObjectVisible && this.labelObjectVisible < 0.5) {
            this.unHighlight();
        }

        let strideMult = mapRange(this.random, 0,1, 0.8,1.2);
        for (let k in this.actions) {
            this.actions[k].setEffectiveWeight(0);
        }
        
        if (this.dist < 0.2) {
            let f = mapRange(this.dist, 0,0.2, 0,1);
            this.actions.set.setEffectiveWeight(1 - f);
            this.actions.lowsprint.setEffectiveWeight(f);
            
        }
        else if (this.dist < 20) {
            let f = mapRange(this.dist, 0.2,20, 0,1);
            let distPerLoop = mapRange(f, 0,1, 2.5,5.8);
            let distTraveled = this.dist-this.pdist;
            let loop = distTraveled / distPerLoop * strideMult;
            this.actions.lowsprint.setEffectiveWeight((1 - f) * (1 - hurdle));
            this.actions.lowsprint.time = phase !== null ? phase * this.actions.lowsprint.getClip().duration : pmod(
                this.actions.lowsprint.time + this.actions.lowsprint.getClip().duration * loop,
                this.actions.lowsprint.getClip().duration
            );
            this.actions.sprint.setEffectiveWeight(f * (1 - hurdle));
            this.actions.sprint.time = phase !== null ? phase * this.actions.sprint.getClip().duration : pmod(
                this.actions.lowsprint.time * this.actions.sprint.getClip().duration/this.actions.lowsprint.getClip().duration,
                this.actions.sprint.getClip().duration
            );
            this.actions.hurdle.setEffectiveWeight(hurdle);
            this.actions.hurdle.time = phase !== null ? phase * this.actions.hurdle.getClip().duration : 0;
        }
        else if (this.dist < race.raceDistance) {
            this.actions.sprint.setEffectiveWeight(1 - hurdle);
            this.actions.sprint.time = phase !== null ? phase * this.actions.sprint.getClip().duration : pmod(
                this.actions.sprint.time + (this.dist - this.pdist) * this.actions.sprint.getClip().duration/5.8 * strideMult,
                this.actions.sprint.getClip().duration
            );
            this.actions.hurdle.setEffectiveWeight(hurdle);
            this.actions.hurdle.time = phase !== null ? phase * this.actions.hurdle.getClip().duration : 0;
        }
        else {
            let pp = this.pposTheta.p;
            let p = this.posTheta.p;
            this.actions.sprint.setEffectiveWeight(1 - hurdle);
            let ddist = Math.sqrt((pp.x - p.x)**2 + (pp.y - p.y)**2);
            this.actions.sprint.time = phase !== null ? phase * this.actions.sprint.getClip().duration : pmod(
                this.actions.sprint.time + ddist * this.actions.sprint.getClip().duration/5.8 * strideMult,
                this.actions.sprint.getClip().duration
            );
            this.actions.hurdle.setEffectiveWeight(hurdle);
            this.actions.hurdle.time = phase !== null ? phase * this.actions.hurdle.getClip().duration : 0;
            this.mixer.update(0);
            this.armature.position.set(p.x, p.y, p.z);
            this.armature.rotation.set(0,0,Math.atan2(p.x - pp.x, pp.y - p.y, ));
            return;
        }

        this.mixer.update(0);
        let {p,theta} = this.posTheta;
        this.armature.position.set(p.x, p.y, p.z);
        this.armature.rotation.set(0,0,theta);
    }
}