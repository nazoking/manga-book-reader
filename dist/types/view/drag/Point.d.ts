export declare class Point {
    readonly x: number;
    readonly y: number;
    static Zero: Point;
    constructor(x: number, y: number);
    toString(): string;
    div(n: number): Point;
    mul(n: number): Point;
    plus(p: Point): Point;
    minus(p?: Point): Point;
    distance(): number;
}
//# sourceMappingURL=Point.d.ts.map