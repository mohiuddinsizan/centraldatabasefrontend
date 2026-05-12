// 'use client';

// import { Trash2 } from 'lucide-react';

// export default function ImageBlock({ images, onRemove }) {
//   if (!images || images.length === 0) return null;

//   return (
//     <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
//       {images.map((img, index) => (
//         <div key={index} className="relative group border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
//           <img
//             src={img.url}
//             alt={img.label || `Image ${index + 1}`}
//             className="w-full h-auto max-h-64 object-contain"
//           />
          
//           {img.label && (
//             <div className="p-3 bg-white border-t border-gray-200 text-sm text-gray-700">
//               {img.label}
//             </div>
//           )}

//           {onRemove && (
//             <button
//               type="button"
//               onClick={() => onRemove(index)}
//               className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-700"
//             >
//               <Trash2 size={16} />
//             </button>
//           )}
//         </div>
//       ))}
//     </div>
//   );
// }