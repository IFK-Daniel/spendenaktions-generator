import { initAuth } from "./auth.js";
import { initGenerator } from "./generator.js";

let generatorInitialized = false;

initAuth({
  onAuthenticated: () => {
    if (generatorInitialized) return;
    generatorInitialized = true;
    initGenerator();
  },
});
