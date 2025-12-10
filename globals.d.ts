// globals.d.ts declarations for CSS modules
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}