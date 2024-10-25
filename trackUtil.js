import * as THREE from 'three';
import { mapRange } from './util.js';

export const STATES = {
    MARK: 1,
    SET:  2,
    GO:   3,
};

const centerX = -39.3447;
const centerY = -42.2861;
const laneWidth = 1.2;
const laneLineWidth = 0.05;
const minorRadius0 = 36.4385;
const radius0 = Math.abs(centerX);
const straightLength = Math.abs(centerY) * 2;
const curveLengthCorrection = (200-straightLength)/(radius0*Math.PI);

export function getTrackPos100(lane, dist) {
    return {
        p:  new THREE.Vector3(
            centerX*2 - laneWidth*(lane - 0.5),
            centerY*2 + 100 - dist,
            0
        ),
        theta: 0
    };
}

export function getTrackPos200(lane, dist) {
    const radius = radius0 + laneWidth * (lane - 0.5);
    const minorRadius = minorRadius0 + laneWidth * (lane - 0.5);
    const curveLength = radius * Math.PI * curveLengthCorrection;

    let x,y,theta;

    if (dist > 200 - straightLength){
        //back stretch
        x = centerX*2 - laneWidth * (lane - 0.5);
        y = centerY*2 + 200 - dist;
        theta = 0;
    }
    else if (dist > 200 - straightLength - curveLength){
        //curve
        theta = (200 - dist - straightLength) / curveLengthCorrection / (radius - laneWidth/2);
        x = centerX - radius * Math.cos(theta);
        y = minorRadius * Math.sin(theta);
        theta = -theta;
    }
    else {
        //straight before start
        x = laneWidth * (lane - 0.5);
        y = dist - (200 - straightLength - curveLength);
        theta = Math.PI;
    }
    
    return {
        p:  new THREE.Vector3(
            x,
            y,
            0
        ),
        theta: theta
    };
}

export function getTrackPos400(lane, dist) {
    const radius = radius0 + laneWidth * (lane - 0.5);
    const minorRadius = minorRadius0 + laneWidth * (lane - 0.5);
    const curveLength = radius * Math.PI * curveLengthCorrection; //in race units

    let x,y,theta;

    if (dist > 400 - straightLength) {
        //back stretch
        x = centerX*2 - laneWidth * (lane - 0.5);
        y = centerY*2 + 400 - dist;
        theta = 0;
    }
    else if (dist > 400 - straightLength - curveLength) {
        //second curve
        theta = (400 - dist - straightLength) / curveLengthCorrection / (radius);
        x = centerX - radius * Math.cos(theta);
        y = minorRadius * Math.sin(theta);
        theta = -theta;
    }
    else if (dist > 400 - 2*straightLength - curveLength) {
        //front stretch
        x = laneWidth * (lane - 0.5);
        y = dist - (400 - straightLength - curveLength);
        theta = Math.PI;
    }
    else if (dist > 400 - 2*straightLength - 2*curveLength) {
        //first curve
        theta = (400 - dist - 2*straightLength - curveLength) / (radius - laneWidth) / curveLengthCorrection;
        x = centerX + radius * Math.cos(theta);
        y = centerY*2 - minorRadius * Math.sin(theta);
        theta = Math.PI-theta;
    }
    else {
        //straight before start
        x = centerX*2 - laneWidth * (lane - 0.5);
        y = -straightLength - (dist - (400 - 2*straightLength - 2*curveLength));
        theta = 0;
    }

    return {
        p:  new THREE.Vector3(
            x,
            y,
            0
        ),
        theta: theta
    };
}

export function getTrackPos800(lane, dist) {
    const radius = radius0 + laneWidth * (lane - 0.5);
    const radius1 = radius0 + laneWidth * 0.5;
    const minorRadius = minorRadius0 + laneWidth * (lane - 0.5);
    const curve0Length = radius0 * Math.PI * curveLengthCorrection;
    const curveLength = radius * Math.PI * curveLengthCorrection; //in race units
    const curve1Length = radius1 * Math.PI * curveLengthCorrection;
    const minor1 = minorRadius0 + laneWidth * 0.5;

    let x,y,theta;

    if (dist > 800 - straightLength) {
        //straight 4
        x = centerX*2 - laneWidth * 0.5;
        y = centerY*2 + 800 - dist;
        theta = 0;
    }
    else if (dist > 800 - straightLength - curve0Length) {
        //curve 4
        theta = (800 - dist - straightLength) / curveLengthCorrection / (radius0);
        x = centerX - radius1 * Math.cos(theta);
        y = minor1 * Math.sin(theta);
        theta = -theta;
    }
    else if (dist > 800 - 2*straightLength - curve0Length) {
        //straight 3
        x = laneWidth * 0.5;
        y = dist - (800 - straightLength - curve0Length);
        theta = Math.PI;
    }
    else if (dist > 800 - 2*straightLength - 2*curve0Length) {
        //curve 3
        theta = (800 - dist - 2*straightLength - curve0Length) / (radius0) / curveLengthCorrection;
        x = centerX + radius1 * Math.cos(theta);
        y = centerY*2 - minor1 * Math.sin(theta);
        theta = Math.PI-theta;
    }
    else if (dist > 800 - 3*straightLength - 2*curve0Length) {
        //straight 2
        x = centerX*2 - laneWidth * 0.5;
        y = 800 - dist - 3*straightLength - 2*curve0Length;
        theta = 0;
    }
    else if (dist > 800 - 3*straightLength - 3*curve0Length) {
        //curve 2
        theta = (800 - dist - 3*straightLength - 2*curve0Length) / (radius0) / curveLengthCorrection;
        x = centerX - radius1 * Math.cos(theta);
        y = minor1 * Math.sin(theta);
        theta = -theta;
    }
    else {
        let x0 = laneWidth * (lane - 0.5);
        let x1 = laneWidth * 0.5;
        let y0 = -straightLength;
        let y1 = 0;
        let diag = Math.sqrt((x1 - x0)**2 + (y1 - y0)**2);
        let d1 = 800 - 3*straightLength - 3*curve0Length;
        let d0 = d1 - diag;
        if (dist > d0) {
            //straight 1 (diagonal from lane break)
            x = mapRange(dist, d0,d1, x0,x1);
            y = mapRange(dist, d0,d1, y0,y1);
            theta = Math.atan2(x1-x0, y1-y0) + Math.PI;
        }
        else if (dist > d0 - curveLength + laneWidth/2) {
            //curve 1
            theta = (d0 - dist) / (radius - laneWidth/2) / curveLengthCorrection;
            x = centerX + radius * Math.cos(theta);
            y = centerY*2 - minorRadius * Math.sin(theta);
            theta = Math.PI-theta;
        }
        else {
            //straight before start
            x = centerX*2 - laneWidth * (lane - 0.5);
            y = -straightLength + d0 - curveLength - dist;
            theta = 0;
        }
    }

    return {
        p:  new THREE.Vector3(
            x,
            y,
            0
        ),
        theta: theta
    };
}

export function getTrackPos1500(lane, dist) {
    const radius = radius0 + laneWidth * (lane - 0.5);
    const radius1 = radius0 + laneWidth * 0.5;
    const minorRadius = minorRadius0 + laneWidth * (lane - 0.5);
    const curveLength = radius * Math.PI * curveLengthCorrection; //in race units
    const curve1Length = radius0 * Math.PI * curveLengthCorrection;
    const minor1 = minorRadius0 + laneWidth * 0.5;

    let x,y,theta;

    if (dist > 800 - straightLength) {
        //straight 4
        x = centerX*2 - laneWidth * 0.5;
        y = centerY*2 + 800 - dist;
        theta = 0;
    }
    else if (dist > 800 - straightLength - curve1Length) {
        //curve 4
        theta = (800 - dist - straightLength) / curveLengthCorrection / (radius1);
        x = centerX - radius1 * Math.cos(theta);
        y = minor1 * Math.sin(theta);
        theta = -theta;
    }
    else if (dist > 800 - 2*straightLength - curve1Length) {
        //straight 3
        x = laneWidth * 0.5;
        y = dist - (800 - straightLength - curve1Length);
        theta = Math.PI;
    }
    else if (dist > 800 - 2*straightLength - 2*curve1Length) {
        //curve 3
        theta = (800 - dist - 2*straightLength - curve1Length) / (radius1) / curveLengthCorrection;
        x = centerX + radius1 * Math.cos(theta);
        y = centerY*2 - minor1 * Math.sin(theta);
        theta = Math.PI-theta;
    }
    else if (dist > 800 - 3*straightLength - 2*curve1Length) {
        //straight 2
        x = centerX*2 - laneWidth * 0.5;
        y = 800 - dist - 3*straightLength - 2*curve1Length;
        theta = 0;
    }
    else if (dist > 800 - 3*straightLength - 3*curve1Length) {
        //curve 2
        theta = (800 - dist - 3*straightLength - 2*curve1Length) / (radius1) / curveLengthCorrection;
        x = centerX - radius1 * Math.cos(theta);
        y = minor1 * Math.sin(theta);
        theta = -theta;
    }
    else {
        let x0 = laneWidth * (lane - 0.5);
        let x1 = laneWidth * 0.5;
        let y0 = -straightLength;
        let y1 = 0;
        let diag = Math.sqrt((x1 - x0)**2 + (y1 - y0)**2);
        let d1 = 800 - 3*straightLength - 3*curve1Length;
        let d0 = d1 - diag;

        if (dist > d0) {
            //straight 1 (diagonal from lane break)
            x = mapRange(dist, d0,d1, x0,x1);
            y = mapRange(dist, d0,d1, y0,y1);
            theta = Math.atan(x1-x0, y1-y0);
        }
        else if (dist > d0 - curveLength) {
            //curve 1
            theta = d0 / (radius - laneWidth) / curveLengthCorrection;
            x = centerX + radius * Math.cos(theta);
            y = centerY*2 - minorRadius * Math.sin(theta);
            theta = Math.PI-theta;
        }
        else {
            //straight before start
            x = centerX*2 - laneWidth * (lane - 0.5);
            y = -straightLength + d0 - curveLength - dist;
            theta = 0;
        }
    }

    return {
        p:  new THREE.Vector3(
            x,
            y,
            0
        ),
        theta: theta
    };
}