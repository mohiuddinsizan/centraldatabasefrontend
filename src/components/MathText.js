// 'use client';

// import { useState, useEffect, useRef } from 'react';

// let katexLoaded = false;
// let katexLoadPromise = null;

// const loadKaTeX = () => {
//   if (katexLoaded) return Promise.resolve();
//   if (katexLoadPromise) return katexLoadPromise;

//   katexLoadPromise = new Promise((resolve) => {
//     if (document.getElementById('katex-css')) {
//       katexLoaded = true;
//       resolve();
//       return;
//     }

//     const link = document.createElement('link');
//     link.id = 'katex-css';
//     link.rel = 'stylesheet';
//     link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
//     document.head.appendChild(link);

//     const script = document.createElement('script');
//     script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
//     script.onload = () => {
//       const autorender = document.createElement('script');
//       autorender.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js';
//       autorender.onload = () => {
//         katexLoaded = true;
//         resolve();
//       };
//       document.head.appendChild(autorender);
//     };
//     document.head.appendChild(script);
//   });

//   return katexLoadPromise;
// };

// export default function MathText({ text, className = '' }) {
//   const ref = useRef(null);
//   const [ready, setReady] = useState(katexLoaded);

//   useEffect(() => {
//     loadKaTeX().then(() => setReady(true));
//   }, []);

//   useEffect(() => {
//     if (!ready || !ref.current || !text) return;

//     try {
//       if (window.renderMathInElement) {
//         window.renderMathInElement(ref.current, {
//           delimiters: [
//             { left: '$$', right: '$$', display: true },
//             { left: '$', right: '$', display: false },
//             { left: '\\(', right: '\\)', display: false },
//             { left: '\\[', right: '\\]', display: true },
//           ],
//           throwOnError: false,
//         });
//       }
//     } catch (e) {
//       console.warn('KaTeX rendering failed:', e);
//     }
//   }, [ready, text]);

//   if (!text) return null;

//   return (
//     <div
//       ref={ref}
//       className={`prose prose-blue max-w-none ${className}`}
//       dangerouslySetInnerHTML={{ __html: text }}
//     />
//   );
// }