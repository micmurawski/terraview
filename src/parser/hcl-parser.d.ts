declare module 'hcl-parser' {
    export function parse(content: string): {
      result: any;
      error: any;
    };
  }