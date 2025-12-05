/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly IS_DEBUG: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
