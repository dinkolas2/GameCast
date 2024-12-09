import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { race, athleteParent, matSkin, matText } from './init.js';

import { mapRange, pmod } from './util.js';

const loader = new FontLoader();

export class Athlete {
    constructor (athleteScene, animations, athleteInfo, id) {
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

        const nameDiv = document.createElement('div');
        nameDiv.className = 'athleteName';
        nameDiv.textContent = `${athleteInfo.firstName} ${athleteInfo.lastName}`;

        this.nameObjectVisible = 0;
        this.nameObject = new CSS2DObject(nameDiv);
        this.nameObject.position.set(0,0,2.5);
        this.armature.add(this.nameObject);
        this.nameObject.visible = false;

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
        this.matCol1 = new THREE.MeshPhongMaterial({ color: color1 });
        this.matCol1.castShadow = true;
        this.matCol1.receiveShadow = true;
        this.matCol2 = new THREE.MeshPhongMaterial({ color: color2 });
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
            }
            else if (child.name === 'geoCol2') {
                child.material = this.matCol2; 
                child.castShadow = true;
                child.receiveShadow = true;
                this.meshCol2 = child;
                this.meshCol2.pickID = this.pickID;
            }
            else if (child.name === 'geoSkin') {
                child.material = matSkin;
                child.castShadow = true;
                child.receiveShadow = true;
                this.meshSkin = child;
                this.meshSkin.pickID = this.pickID;
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
        this.nameObjectVisible = 1;
    }

    unHighlight() {
        return;
    }


    pose(phase = null, hurdle = 0) {
        this.nameObjectVisible *= 0.99;
        this.nameObject.visible = this.nameObjectVisible > 0.5;

        let strideMult = mapRange(this.random, 0,1, 0.9,1.1);
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