export class Point {
  static Zero: Point = new Point(0, 0);

  constructor(
    public readonly x: number,
    public readonly y: number
  ) { }

  public toString(): string {
    return `(${this.x};${this.y})`;
  }
  div(n:number){
    return new Point(this.x / n, this.y / n);
  }
  mul(n:number){
    return new Point(this.x * n, this.y * n);
  }
  plus(p:Point){
    return new Point(this.x + p.x, this.y + p.y);
  }
  minus(p?:Point){
    return p ? new Point(this.x - p.x, this.y - p.y) : new Point(-this.x, -this.y);
  }
  distance(): number{
    return Math.sqrt( Math.pow(this.x, 2) + Math.pow(this.y, 2));
  }
}
