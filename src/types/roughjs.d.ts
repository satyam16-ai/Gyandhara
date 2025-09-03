declare module 'roughjs' {
  export interface RoughCanvas {
    line(x1: number, y1: number, x2: number, y2: number, options?: any): void
    rectangle(x: number, y: number, width: number, height: number, options?: any): void
    circle(x: number, y: number, radius: number, options?: any): void
    polygon(points: number[][], options?: any): void
    linearPath(points: number[][], options?: any): void
  }

  export interface RoughSVG {
    line(x1: number, y1: number, x2: number, y2: number, options?: any): SVGElement
    rectangle(x: number, y: number, width: number, height: number, options?: any): SVGElement
    circle(x: number, y: number, radius: number, options?: any): SVGElement
    polygon(points: number[][], options?: any): SVGElement
  }

  export interface Rough {
    canvas(canvas: HTMLCanvasElement): RoughCanvas
    svg(svg: SVGElement): RoughSVG
  }

  const rough: Rough
  export default rough
}
