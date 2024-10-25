import { mapRange } from "./util.js";

const results100 = 
{
    race: "100m",
    athletes: [],
};
for (let lane = 1; lane <= 9; lane++) {
    let athlete = {
         
        color1: {r: Math.random(), g: Math.random(), b: Math.random()}, 
        color2: {r: Math.random(), g: Math.random(), b: Math.random()},
        lane,
        reactionTime: mapRange(Math.random(), 0,1, 0.1,0.18),
        splits: [],
        time: mapRange(Math.random(), 0,1, 9.5, 10.2),
    };
    for (let time = 2; time < athlete.time - 2; time += 2) {
        let dist = mapRange(time, 0,athlete.time, 0,100) + mapRange(Math.random(), 0,1, -5,5);
        athlete.splits.push({dist, time});
    }

    results100.athletes.push(athlete);
}

const results200 = 
{
    race: "200m",
    athletes: [],
};
for (let lane = 1; lane <= 9; lane++) {
    let athlete = {
        time: mapRange(Math.random(), 0,1, 19.4, 20.6), 
        color1: {r: Math.random(), g: Math.random(), b: Math.random()}, 
        color2: {r: Math.random(), g: Math.random(), b: Math.random()}, 
        reactionTime: mapRange(Math.random(), 0,1, 0.1,0.18),
        lane,
        splits: [],
    };
    for (let time = 3; time < athlete.time - 3; time += 3) {
        let dist = mapRange(time, 0,athlete.time, 0,200) + mapRange(Math.random(), 0,1, -5,5);
        athlete.splits.push({dist, time});
    }

    results200.athletes.push(athlete);
}

const results400 = 
{
    race: "400m",
    athletes: [],
};
for (let lane = 1; lane <= 9; lane++) {
    let athlete = {
        time: mapRange(Math.random(), 0,1, 43, 46), 
        color1: {r: Math.random(), g: Math.random(), b: Math.random()}, 
        color2: {r: Math.random(), g: Math.random(), b: Math.random()}, 
        reactionTime: mapRange(Math.random(), 0,1, 0.1,0.18),
        lane,
        splits: [],
    };
    for (let time = 3; time < athlete.time - 3; time += 3) {
        let dist = mapRange(time, 0,athlete.time, 0,400) + mapRange(Math.random(), 0,1, -5,5);
        athlete.splits.push({dist, time});
    }

    results400.athletes.push(athlete);
}

const results800 = 
{
    race: "800m",
    athletes: [],
};
for (let lane = 1; lane <= 9; lane++) {
    let athlete = {
        time: mapRange(Math.random(), 0,1, 101,105), 
        color1: {r: Math.random(), g: Math.random(), b: Math.random()}, 
        color2: {r: Math.random(), g: Math.random(), b: Math.random()}, 
        reactionTime: mapRange(Math.random(), 0,1, 0.1,0.18),
        lane,
        splits: [],
    };
    for (let time = 5; time < athlete.time - 5; time += 5) {
        let dist = mapRange(time, 0,athlete.time, 0,800) + mapRange(Math.random(), 0,1, -5,5);
        athlete.splits.push({dist, time});
    }

    results800.athletes.push(athlete);
}

const results1500 = 
{
    race: "1500m",
    athletes: [],
};
for (let lane = 1; lane <= 9; lane++) {
    let athlete = {
        time: mapRange(Math.random(), 0,1, 207, 215), 
        color1: {r: Math.random(), g: Math.random(), b: Math.random()}, 
        color2: {r: Math.random(), g: Math.random(), b: Math.random()}, 
        reactionTime: mapRange(Math.random(), 0,1, 0.1,0.18),
        lane,
        splits: [],
    };
    for (let time = 5; time < athlete.time - 5; time += 5) {
        let dist = mapRange(time, 0,athlete.time, 0,1500) + mapRange(Math.random(), 0,1, -5,5);
        athlete.splits.push({dist, time});
    }

    results1500.athletes.push(athlete);
}

export const results = results800;
console.log('results', results);