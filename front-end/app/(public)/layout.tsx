"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { authApi, languageApi, onlineDeviceApi, poiApi } from "@/lib/api";
import { User } from "@/types/auth";
import { Languages, ChevronDown, Check, Loader2 } from "lucide-react";

// Kiểu dữ liệu cho Language từ Backend
interface Language {
	id: string;
	code: string;
	name: string;
	is_active: boolean;
}

export default function PublicLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [user, setUser] = useState<User | null>(null);
	const [mounted, setMounted] = useState(false);

	// --- State cho Ngôn ngữ Dynamic ---
	const [activeLanguages, setActiveLanguages] = useState<Language[]>([]);
	const [currentLangCode, setCurrentLangCode] = useState<string>("vi-VN");
	const [showLangModal, setShowLangModal] = useState(false);
	const [isLoadingLangs, setIsLoadingLangs] = useState(true);

	const router = useRouter();
	const pathname = usePathname();
	const isMapPage = pathname === "/map";

	// 1. Fetch danh sách ngôn ngữ đang hoạt động từ DB
	const fetchActiveLanguages = useCallback(async () => {
		try {
			setIsLoadingLangs(true);
			const res = await languageApi.getActive();
			// Giả sử API trả về { success: true, data: Language[] }
			if (res.data) {
				setActiveLanguages(res.data.data);
			}
		} catch (err) {
			console.error("❌ Lỗi fetch ngôn ngữ:", err);
		} finally {
			setIsLoadingLangs(false);
		}
	}, []);

	// 2. Logic thay đổi ngôn ngữ
	const handleSelectLanguage = (code: string) => {
		setCurrentLangCode(code);
		localStorage.setItem("preferred_lang", code);
		setShowLangModal(false);

		// Phát sự kiện để các component khác (như Map hoặc POI Detail) tự động cập nhật data
		window.dispatchEvent(new Event("lang-change"));
	};

	// 3. Khởi tạo dữ liệu
	useEffect(() => {
		setMounted(true);
		fetchActiveLanguages();

		const savedLang = localStorage.getItem("preferred_lang");
		if (savedLang) {
			setCurrentLangCode(savedLang);
		} else if (pathname === "/map") {
			setShowLangModal(true);
		}
	}, [fetchActiveLanguages, pathname]);

	// --- Logic Auth (Giữ nguyên) ---
	const handleLogout = useCallback(async () => {
		const sessionId = localStorage.getItem("current_session_id");

		// 1. Dừng Heartbeat ngay lập tức để tránh gửi thêm request lỗi
		if ((window as any).heartbeatInterval) {
			clearInterval((window as any).heartbeatInterval);
			(window as any).heartbeatInterval = null;
		}

		// 2. Gọi API kết thúc session và ĐỢI (await)
		if (sessionId) {
			try {
				// Đợi server xác nhận đã đóng session thành công
				await onlineDeviceApi.endSession(sessionId);
			} catch (err) {
				// Nếu lỗi (ví dụ session đã hết hạn trước đó), vẫn tiếp tục dọn dẹp local
				console.error("Failed to end session on server", err);
			}
		}

		// 3. Xóa sạch dữ liệu Local sau khi API đã xong
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		localStorage.removeItem("current_session_id");

		// 4. Phát sự kiện và chuyển hướng
		window.dispatchEvent(new Event("auth-change"));
		router.push("/login");
	}, [router]);

	const syncUser = useCallback(async () => {
		const token = localStorage.getItem("token");
		if (!token) {
			setUser(null);
			return;
		}
		try {
			const res = await authApi.getMe();
			setUser(res.data);
			localStorage.setItem("user", JSON.stringify(res.data));
		} catch (err) {
			handleLogout();
		}
	}, [handleLogout]);

	useEffect(() => {
		syncUser();
		window.addEventListener("auth-change", syncUser);
		return () => window.removeEventListener("auth-change", syncUser);
	}, [syncUser]);

	useEffect(() => {
		const handleUserLocalUpdate = (event: Event) => {
			const customEvent = event as CustomEvent<{
				balance?: number;
				points?: number;
			}>;
			const nextBalance = Number(customEvent.detail?.balance);
			const nextPoints = Number(customEvent.detail?.points);

			setUser((prev) => {
				if (!prev) return prev;
				const updated = {
					...prev,
					balance: Number.isFinite(nextBalance) ? nextBalance : prev.balance,
					points: Number.isFinite(nextPoints) ? nextPoints : prev.points,
				};
				localStorage.setItem("user", JSON.stringify(updated));
				return updated;
			});
		};

		window.addEventListener(
			"user-local-update",
			handleUserLocalUpdate as EventListener,
		);
		return () =>
			window.removeEventListener(
				"user-local-update",
				handleUserLocalUpdate as EventListener,
			);
	}, []);

	// Helper hiển thị Flag dựa trên mã code (vi-VN, en-US, ja-JP)
	const getFlag = (code: string) => {
		const c = code.toLowerCase();
		if (c.includes("vi")) return "🇻🇳";
		if (c.includes("en")) return "🇺🇸";
		if (c.includes("ja")) return "🇯🇵";
		return "🌐";
	};

	if (!mounted) return null;

	return (
		<div
			className={
				isMapPage
					? "h-[100dvh] overflow-hidden bg-background text-foreground"
					: "min-h-screen bg-background text-foreground"
			}
		>
			<header className="bg-card border-b border-border sticky top-0 z-[3000] shadow-sm">
				<nav className="container mx-auto px-3 sm:px-4 md:px-6 h-14 sm:h-16 flex items-center justify-between">
					<div className="flex items-center gap-4 sm:gap-6 md:gap-8 min-w-0">
						<Link
							href="/"
							className="text-lg sm:text-xl md:text-2xl font-black text-primary tracking-tighter whitespace-nowrap flex-shrink-0"
						>
							FOOD TOUR
						</Link>

						<div className="hidden md:flex items-center gap-4 lg:gap-6">
							<Link
								href="/map"
								className={`text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
									pathname === "/map"
										? "text-primary"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Bản đồ
							</Link>
							{user?.role === "admin" && (
								<Link
									href="/admin"
									className={`text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
										pathname.startsWith("/admin")
											? "text-primary"
											: "text-muted-foreground hover:text-foreground"
									}`}
								>
									Quản trị
								</Link>
							)}
							{user?.role === "owner" && (
								<Link
									href="/owner"
									className={`text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
										pathname.startsWith("/owner")
											? "text-primary"
											: "text-muted-foreground hover:text-foreground"
									}`}
								>
									Quản lý địa điểm
								</Link>
							)}
						</div>
					</div>

					<div className="flex items-center gap-2 sm:gap-3 md:gap-4 ml-auto flex-shrink-0">
						{/* --- BỘ CHỌN NGÔN NGỮ DYNAMIC --- */}
						<div className="relative group">
							<button className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors border border-border text-xs sm:text-sm">
								{isLoadingLangs ? (
									<Loader2
										size={14}
										className="animate-spin text-muted-foreground flex-shrink-0"
									/>
								) : (
									<>
										<span className="text-sm sm:text-base">{getFlag(currentLangCode)}</span>
										<span className="text-[10px] sm:text-xs font-bold uppercase hidden sm:inline">
											{currentLangCode.split("-")[0]}
										</span>
										<ChevronDown size={12} className="text-muted-foreground flex-shrink-0 hidden sm:inline" />
									</>
								)}
							</button>

							{!isLoadingLangs && activeLanguages.length > 0 && (
								<div className="absolute right-0 top-full pt-2 w-48 sm:w-56 lg:w-60 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[3010]">
									<div className="bg-card border border-border rounded-lg sm:rounded-xl shadow-xl overflow-hidden p-1">
										{activeLanguages.map((lang) => (
											<button
												key={lang.id}
												onClick={() => handleSelectLanguage(lang.code)}
												className="w-full flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium hover:bg-muted rounded-lg transition-colors"
											>
												<div className="flex items-center gap-2 min-w-0">
													<span className="text-xs sm:text-sm">{lang.code}</span>
													<span className="truncate text-xs sm:text-sm">{lang.name}</span>
												</div>
												{currentLangCode === lang.code && (
													<Check size={12} className="text-primary flex-shrink-0" />
												)}
											</button>
										))}
									</div>
								</div>
							)}
						</div>

						{/* --- PHẦN USER --- */}
						{user ? (
							<div className="flex items-center gap-2 sm:gap-3 md:gap-4">
								<div className="hidden sm:flex flex-col items-end leading-tight border-r border-border pr-2 sm:pr-3 md:pr-4">
									<span className="text-xs sm:text-sm font-bold text-emerald-600 truncate">
										{user.balance.toLocaleString("vi-VN")}đ
									</span>
									<span className="text-[8px] sm:text-[10px] font-bold text-orange-500 uppercase whitespace-nowrap">
										⭐ {user.points}
									</span>
								</div>

								<div className="relative group">
									<button className="flex items-center gap-2 p-0.5 rounded-full border-2 border-transparent hover:border-primary/20 transition-all flex-shrink-0">
										<div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold shadow-sm text-xs sm:text-sm">
											{user.full_name?.charAt(0).toUpperCase() || "U"}
										</div>
									</button>

									<div className="absolute right-0 top-full pt-2 w-48 sm:w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[3010]">
										<div className="bg-card border border-border rounded-lg sm:rounded-2xl shadow-xl overflow-hidden">
											<div className="px-3 sm:px-4 py-2 sm:py-3 bg-muted/20 border-b border-border text-foreground">
												<p className="text-xs sm:text-sm font-bold truncate">
													{user.full_name}
												</p>
												<p className="text-[10px] sm:text-xs text-muted-foreground truncate">
													{user.email}
												</p>
											</div>
											<div className="p-1">
												<Link
													href="/profile"
													className="block px-3 py-2 text-xs sm:text-sm rounded-lg font-medium hover:bg-muted transition-colors whitespace-nowrap"
												>
													Trang cá nhân
												</Link>
												<hr className="my-1 border-border/50" />
												<button
													onClick={handleLogout}
													className="w-full text-left px-3 py-2 text-xs sm:text-sm text-destructive font-bold hover:bg-destructive/10 rounded-lg transition-colors whitespace-nowrap"
												>
													Đăng xuất
												</button>
											</div>
										</div>
									</div>
								</div>
							</div>
						) : (
							<Link
								href="/login"
								className="px-3 sm:px-6 py-1.5 sm:py-2 bg-primary text-white rounded-full text-xs sm:text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all whitespace-nowrap"
							>
								Đăng nhập
							</Link>
						)}
					</div>
				</nav>
			</header>

			<main
				className={
					isMapPage
						? "h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)] overflow-hidden"
						: "min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]"
				}
			>
				{children}
			</main>

			{/* --- MODAL CHỌN NGÔN NGỮ KHỞI TẠO (DYNAMIC) --- */}
			{showLangModal && activeLanguages.length > 0 && (
				<div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
					<div className="bg-card w-full max-w-sm rounded-lg sm:rounded-[2rem] shadow-2xl p-4 sm:p-8 border border-border animate-in fade-in zoom-in duration-300">
						<div className="text-center space-y-3 sm:space-y-4">
							<div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
								<Languages size={32} className="text-primary sm:w-10 sm:h-10" />
							</div>
							<h2 className="text-xl sm:text-2xl font-black tracking-tight">
								CHỌN NGÔN NGỮ
							</h2>
							<p className="text-muted-foreground text-xs sm:text-sm font-medium pb-2 sm:pb-4">
								Hãy chọn ngôn ngữ để chúng tôi cung cấp thuyết minh bản đồ phù
								hợp nhất với bạn.
							</p>

							<div className="grid gap-2 sm:gap-3">
								{activeLanguages.map((lang) => (
									<button
										key={lang.id}
										onClick={() => handleSelectLanguage(lang.code)}
										className="flex items-center justify-between p-2 sm:p-4 rounded-lg sm:rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
									>
										<span className="text-base sm:text-lg font-bold">
											{getFlag(lang.code)}{" "}
											<span className="ml-2">{lang.name}</span>
										</span>
										<div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-border group-hover:border-primary flex items-center justify-center flex-shrink-0">
											<div
												className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-primary transition-opacity ${
													currentLangCode === lang.code
														? "opacity-100"
														: "opacity-0"
												}`}
											/>
										</div>
									</button>
								))}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
