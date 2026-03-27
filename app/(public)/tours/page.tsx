// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";
// import { tourApi } from "@/lib/api";
// import { Tour } from "@/types/tour"; // Đảm bảo bạn đã định nghĩa Interface này

// export default function ToursPage() {
//   const [tours, setTours] = useState<Tour[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchTours = async () => {
//       try {
//         // Mặc định lấy ngôn ngữ tiếng Việt
//         const res = await tourApi.getAll();
//         setTours(res.data);
//       } catch (error) {
//         console.error("Lỗi khi tải danh sách tour:", error);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchTours();
//   }, []);

//   if (loading) {
//     return (
//       <div className="container mx-auto px-4 py-20 flex justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-muted/30 min-h-screen pb-20">
//       {/* Hero Section */}
//       <section className="bg-primary py-16 text-white">
//         <div className="container mx-auto px-4 text-center space-y-4">
//           <h1 className="text-4xl md:text-5xl font-black tracking-tight">
//             HÀNH TRÌNH ẨM THỰC
//           </h1>
//           <p className="text-primary-foreground/80 max-w-2xl mx-auto font-medium">
//             Khám phá những cung đường ăn uống được tuyển chọn kỹ lưỡng, 
//             kèm theo thuyết minh tự động khi bạn đặt chân tới điểm đến.
//           </p>
//         </div>
//       </section>

//       <div className="container mx-auto px-4 -mt-10">
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//           {tours.map((tour) => (
//             <Link 
//               key={tour.id} 
//               href={`/tours/${tour.id}`}
//               className="group bg-card rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 border border-border flex flex-col"
//             >
//               {/* Hình ảnh Tour */}
//               <div className="relative aspect-[16/10] overflow-hidden">
//                 <img 
//                   src={tour.thumbnail_url || "/images/tour-placeholder.jpg"} 
//                   alt={tour.title}
//                   className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
//                 />
//                 <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold">
//                   {tour.category || "Ẩm thực"}
//                 </div>
//               </div>

//               {/* Nội dung Tour */}
//               <div className="p-6 flex-1 flex flex-col">
//                 <div className="flex justify-between items-start mb-2">
//                   <h3 className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-1">
//                     {tour.title}
//                   </h3>
//                 </div>
                
//                 <p className="text-muted-foreground text-sm line-clamp-2 mb-6">
//                   {tour.summary}
//                 </p>

//                 <div className="mt-auto space-y-4">
//                   {/* Thông số nhanh */}
//                   <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
//                     <div className="flex items-center gap-1.5">
//                       <span className="text-primary">⏱</span> {tour.total_duration_minutes} phút
//                     </div>
//                     <div className="flex items-center gap-1.5">
//                       <span className="text-primary">📍</span> {tour.stops_count || 0} địa điểm
//                     </div>
//                   </div>

//                   <hr className="border-border/50" />

//                   {/* Giá và Nút bấm */}
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <p className="text-[10px] text-muted-foreground font-bold uppercase">Giá từ</p>
//                       <p className="text-xl font-black text-primary">
//                         {Number(tour.price) === 0 ? "Miễn phí" : `${Number(tour.price).toLocaleString('vi-VN')}đ`}
//                       </p>
//                     </div>
//                     <div className="px-5 py-2.5 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white rounded-xl font-bold text-sm transition-all">
//                       Xem chi tiết
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </Link>
//           ))}
//         </div>

//         {tours.length === 0 && (
//           <div className="text-center py-20">
//             <p className="text-muted-foreground">Hiện chưa có tour nào khả dụng. Hãy quay lại sau nhé!</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }