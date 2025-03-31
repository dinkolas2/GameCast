import * as THREE from 'three';
import { mapRange, pmod } from './util.js';

//CONSTANTS
const straightEndX = -48.7944;
const straightLaneWidth = 1.2;
const straightStartY = 10.3606;
const centerX = -23.8973;
const centerY = 16.5856;
const laneWidth = 0.9;
const laneLineWidth = 0.05;
const radius = 16.58565;
//Game track 200m start has 0.05m (width of start line) of straight then 
//goes into the curve.
const straightLength = 47.8946;

//stagger is number of turns which are laned. 
export function buildShortTrackGetPosThetaPhi(total, stagger) {
    if (total === 55 || total === 60) {
        return (lane, dist) => {return {
            p: new THREE.Vector3(
                straightEndX + (total - dist),
                straightStartY + straightLaneWidth*0.5 + (lane - 1) * (straightLaneWidth + laneLineWidth),
                0
            ),
            theta: -Math.PI/2,
            phi: 0,
        }}
    }
    else if (!stagger || stagger < 0 || stagger * 100 >= total - 50) {
        //fully laned race
        return (lane, dist) => {
            let remaining = total - dist;
            let radiusLn = radius + (laneWidth+laneLineWidth) * (lane - 1);
            let curveLength = radiusLn * Math.PI;
            let loopLength = 2*straightLength + 2*curveLength;

            let x,y,z,theta,phi;
            
            remaining = pmod(remaining, loopLength);
            if (remaining < straightLength) {
                x = laneLineWidth - remaining
                y = -(laneWidth * 0.5 + (lane - 1) * (laneWidth + laneLineWidth))
                theta = Math.PI/2
            }
            else if (remaining < straightLength + curveLength) {
                theta = (remaining - straightLength) / radiusLn
                x = centerX - straightLength/2 - (radiusLn + laneWidth*0.5) * Math.sin(theta)
                y = centerY - (radiusLn + laneWidth*0.5) * Math.cos(theta)
                theta = Math.PI/2 - theta
            }
            else if (remaining < straightLength*2 + curveLength) {
                theta = -Math.PI/2
                x = laneLineWidth + remaining - 2*straightLength - curveLength
                y = centerY + radius + laneWidth*0.5 + (lane - 1) * (laneWidth + laneLineWidth)
            }
            else if (remaining < straightLength*2 + 2*curveLength) {
                theta = (remaining - 2*straightLength - curveLength) / radiusLn
                x = centerX + straightLength/2 + (radiusLn + laneWidth*0.5) * Math.sin(theta)
                y = centerY + (radiusLn + laneWidth*0.5) * Math.cos(theta)
                theta = -Math.PI/2 - theta
            }
            else {
                x = -(remaining - straightLength*2 - 2*curveLength)
                y = -(laneWidth * 0.5 + (lane - 1) * (laneWidth + laneLineWidth))
                theta = Math.PI/2
            }
            let slopeCoord = pmod(remaining + curveLength/2, loopLength)
            slopeCoord = pmod(slopeCoord, loopLength*0.5)
            slopeCoord = Math.abs(slopeCoord - loopLength/4)
            slopeCoord = mapRange(slopeCoord, 18.01805, loopLength/4 - curveLength*11/32, 0,1)
            slopeCoord = Math.max(0,Math.min(slopeCoord, 1))
            z = mapRange(lane, 0.5, 6.5, 0, 0.661404) * slopeCoord
            phi = mapRange(slopeCoord, 0,1, 0,0.122)
            return {
                p: new THREE.Vector3(x,y,z),
                theta,
                phi,
            }
        }
    }
    else {
        //unlaned race
        return (lane, dist) => {
            let x, y, z, phi, theta;
            
            let radiusLn = radius + (laneWidth+laneLineWidth) * (lane - 1);
            let curveLength = radiusLn * Math.PI;
            let remaining = total - dist;
            let loopLength = 2*straightLength + 2*curveLength; //for staggered laned section
            let diagonal = Math.sqrt(((lane-1) * (laneWidth+laneLineWidth))**2 + straightLength**2);
            let unlanedMeters = (Math.floor(total/100) - stagger) * 100;
            let lanedMeters = total - (unlanedMeters + diagonal);
            let laned = mapRange(remaining, unlanedMeters+diagonal, unlanedMeters, 1,0) ;
            laned = Math.max(0,Math.min(laned,1));
            //laned=1 when in lanes, laned=0 when all runners in lane 1, and blended when they're 
            //going diagonally across the straightaway to transition
            if (dist > lanedMeters + diagonal) {
                //unlaned section at end
                lane = 1;
                radiusLn = radius;
                curveLength = radiusLn * Math.PI;
                loopLength = 2*straightLength + 2*curveLength; //should be 200
                remaining = pmod(remaining, loopLength);
                if (remaining < straightLength) {
                    x = laneLineWidth - remaining
                    y = -(laneWidth * 0.5 + (lane - 1) * (laneWidth + laneLineWidth))
                    theta = Math.PI/2
                }
                else if (remaining < straightLength + curveLength) {
                    theta = (remaining - straightLength) / radiusLn;
                    x = centerX - straightLength/2 - (radiusLn + laneWidth*0.5) * Math.sin(theta);
                    y = centerY - (radiusLn + laneWidth*0.5) * Math.cos(theta);
                    theta = Math.PI/2 - theta;
                }
                else if (remaining < straightLength*2 + curveLength) {
                    theta = -Math.PI/2;
                    x = laneLineWidth + remaining - 2*straightLength - curveLength;
                    y = centerY + radius + laneWidth*0.5 + (lane - 1) * (laneWidth + laneLineWidth);
                }
                else if (remaining < straightLength*2 + 2*curveLength) {
                    theta = (remaining - 2*straightLength - curveLength) / radiusLn;
                    x = centerX + straightLength/2 + (radiusLn + laneWidth*0.5) * Math.sin(theta);
                    y = centerY + (radiusLn + laneWidth*0.5) * Math.cos(theta);
                    theta = -Math.PI/2 - theta
                }
                else {
                    x = -(remaining - straightLength*2 - 2*curveLength);
                    y = -(laneWidth * 0.5 + (lane - 1) * (laneWidth + laneLineWidth));
                    theta = Math.PI/2;
                }
                let slopeCoord = pmod(remaining + curveLength/2, loopLength)
                slopeCoord = pmod(slopeCoord, loopLength*0.5)
                slopeCoord = Math.abs(slopeCoord - loopLength/4)
                slopeCoord = mapRange(slopeCoord, 18.01805, loopLength/4 - curveLength*11/32, 0,1)
                slopeCoord = Math.max(0,Math.min(slopeCoord, 1))
                z = mapRange(lane, 0.5, 6.5, 0, 0.661404) * slopeCoord
                phi = mapRange(slopeCoord, 0,1, 0,0.122)
            }
            else if (dist > lanedMeters) {
                //diagonal transition across straightaway laned to unlaned
                if (remaining % 200 < 100) {
                    theta = Math.PI/2
                    x = mapRange(remaining, unlanedMeters + diagonal,unlanedMeters, -straightLength+laneLineWidth, laneLineWidth)
                    y = mapRange(remaining, unlanedMeters + diagonal,unlanedMeters, -(laneWidth*0.5 + (lane-1)*(laneWidth+laneLineWidth)), -laneWidth*0.5)
                }
                else {
                    theta = -Math.PI/2
                    x = mapRange(remaining, unlanedMeters + diagonal,unlanedMeters, laneLineWidth, -straightLength+laneLineWidth)
                    y = mapRange(remaining, unlanedMeters + diagonal,unlanedMeters, 2*radius + laneWidth*0.5 + (lane-1)*(laneWidth+laneLineWidth), 2*radius + laneWidth*0.5)
                }
                let slopeCoord = mapRange(remaining, unlanedMeters + diagonal, unlanedMeters, straightLength-laneLineWidth, -laneLineWidth)
                slopeCoord = pmod(slopeCoord + curveLength/2, loopLength)
                slopeCoord = pmod(slopeCoord, loopLength*0.5)
                slopeCoord = Math.abs(slopeCoord - loopLength/4)
                slopeCoord = mapRange(slopeCoord, 18.01805, loopLength/4 - curveLength*11/32, 0,1)
                slopeCoord = Math.max(0,Math.min(slopeCoord, 1))
                z = mapRange(mapRange(laned, 0,1, 1,lane), 0.5, 6.5, 0, 0.661404) * slopeCoord
                phi = mapRange(slopeCoord, 0,1, 0,0.122)
            }
            else {
                //laned section at beginning
                let loopPos = remaining - (unlanedMeters + diagonal) + straightLength + loopLength*0.5*stagger; //kinda hacky stagger
                loopPos = pmod(loopPos, loopLength)
                if (loopPos < straightLength) {
                    x = laneLineWidth - loopPos
                    y = -(laneWidth * 0.5 + (lane - 1) * (laneWidth + laneLineWidth))
                    theta = Math.PI/2
                }
                else if (loopPos < straightLength + curveLength) {
                    theta = (loopPos - straightLength) / radiusLn
                    x = centerX - straightLength/2 - (radiusLn + laneWidth*0.5) * Math.sin(theta)
                    y = centerY - (radiusLn + laneWidth*0.5) * Math.cos(theta)
                    theta = Math.PI/2 - theta
                }
                else if (loopPos < straightLength*2 + curveLength) {
                    theta = -Math.PI/2
                    x = laneLineWidth + loopPos - 2*straightLength - curveLength
                    y = centerY + radius + laneWidth*0.5 + (lane - 1) * (laneWidth + laneLineWidth)
                }
                else if (loopPos < straightLength*2 + 2*curveLength) {
                    theta = (loopPos - 2*straightLength - curveLength) / radiusLn
                    x = centerX + straightLength/2 + (radiusLn + laneWidth*0.5) * Math.sin(theta)
                    y = centerY + (radiusLn + laneWidth*0.5) * Math.cos(theta)
                    theta = -Math.PI/2 - theta
                }
                else {
                    x = -(loopPos - straightLength*2 - 2*curveLength)
                    y = -(laneWidth * 0.5 + (lane - 1) * (laneWidth + laneLineWidth))
                    theta = Math.PI/2
                }
                let slopeCoord = pmod(loopPos + curveLength/2, loopLength);
                slopeCoord = pmod(slopeCoord, loopLength*0.5);
                slopeCoord = Math.abs(slopeCoord - loopLength/4);
                slopeCoord = mapRange(slopeCoord, 18.01805, loopLength/4 - curveLength*11/32, 0,1);
                slopeCoord = Math.max(0,Math.min(slopeCoord, 1));
                z = mapRange(lane, 0.5, 6.5, 0, 0.661404) * slopeCoord;
                phi = mapRange(slopeCoord, 0,1, 0,0.122);
            }

            return {
                p: new THREE.Vector3(
                    x,
                    y,
                    z
                ),
                theta,
                phi
            }
        }
    }
}



//TODO: adjust transformation to fit data.
//TODO: make this function smarter/more general.
//Perhaps replace it with something that uses the lane width
// and the live fromRail and dist values.
export function trackDataTo200mGameTrack(x,y) {
    //TODO: Raycast to model for z value?
    // return new THREE.Vector3(
    //     (x-centerX) * 1.05 + centerX,
    //     (y-centerY + 16) * 0.85 + centerY,
    //     0
    // );
    return new THREE.Vector3(
        x,
        y + 20,
        0
    );
}