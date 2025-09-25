// FIX for MSW v2: import from "msw/browser"
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);
