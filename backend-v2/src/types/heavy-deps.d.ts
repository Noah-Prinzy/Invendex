// Heavy dependencies are only imported dynamically inside the BullMQ worker
// (src/jobs/*). Shorthand ambient declarations keep the API bundle free of
// their types while allowing the lazy `await import(...)` calls to compile.
declare module 'pdfkit';
declare module 'bwip-js';
