export function nameChars(name: string): string[];
export function strokeOf(char: string): { n: number; kind: string } | null;
export function analyze(birth: string, strokes: number[]): {
  Y: number; M: number; D: number; mod: number; total: number; num: number; minus: boolean; A: boolean;
  pc: number; mc: number; z: number; o: number;
};
