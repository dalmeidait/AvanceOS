declare module 'passport-jwt' {
  export const ExtractJwt: {
    fromAuthHeaderAsBearerToken(): (request: unknown) => string | null;
  };

  export class Strategy {
    constructor(options: Record<string, unknown>, verify?: (...args: unknown[]) => unknown);
  }
}
