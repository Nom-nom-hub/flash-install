declare module '@yarnpkg/lockfile' {
  export function parse(lockfileContent: string): {
    type: 'success' | 'merge' | 'conflict';
    object: Record<string, any>;
  };
  
  export function stringify(object: Record<string, any>): string;
}
