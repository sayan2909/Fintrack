declare module "next" {
  export interface Metadata {
    title?: string | { default: string; template: string };
    description?: string;
    appleWebApp?: {
      capable?: boolean;
      statusBarStyle?: string;
      title?: string;
    };
    icons?: Record<string, unknown>;
    [key: string]: unknown;
  }
  export interface Viewport {
    themeColor?: string | Array<{ media: string; color: string }>;
    width?: string;
    initialScale?: number;
    [key: string]: unknown;
  }
  export namespace MetadataRoute {
    export interface Manifest {
      [key: string]: unknown;
    }
  }
}
