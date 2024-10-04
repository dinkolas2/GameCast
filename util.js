export function mapRange(x, a0, a1, b0, b1) {
    return (x - a0) * (b1 - b0) / (a1 - a0) + b0;
}

export function pmod(a, b) {
    return (a % b + b) % b;
}

export function clamp(x, a,b) {
    return Math.max(a, Math.min(x, b));
}

export function mapRangeClamp(x, a0, a1, b0, b1) {
    return clamp(mapRange(x, a0, a1, b0, b1), b0, b1);
}