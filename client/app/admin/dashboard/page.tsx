"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { adminApi } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Attendee = {
	_id: string;
	name: string;
	email: string;
	phoneNumber?: string;
	ticketType: string;
	department?: string;
	designation: string;
	paymentStatus: "pending" | "confirmed" | "declined";
	paymentProof?: string;
	checkInStatus: "checked-in" | "not-checked-in";
	preConferenceQrCode?: string;
	mainConferenceQrCode?: string;
	preConferenceCheckInStatus?: "checked-in" | "not-checked-in";
	mainConferenceCheckInStatus?: "checked-in" | "not-checked-in";
	preConferenceCheckInSource?: "qr" | "manual";
	mainConferenceCheckInSource?: "qr" | "manual";
	createdAt: string;
	referralCode?: string;
	wantsPreConference?: boolean;
	preConferenceInviteSent?: boolean;
	preConferenceDeclinedDuringReg?: boolean;
	preConferenceInviteResponse?: "pending" | "yes" | "no";
};

// ── Paginated API response shape ─────────────────────────────────────────────
type PaginatedAttendees = {
	data: Attendee[];
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
};

type ScanHistoryItem = {
	_id: string;
	name: string;
	email: string;
	ticketType: string;
	scannedAt: string;
	scanStatus: "success" | "already_scanned" | "invalid";
	scanSource?: "qr" | "manual";
	sessionType?: "pre-conference" | "main-conference";
	message?: string;
};

type ScanHistoryStats = {
	totalScans: number;
	successfulCheckIns: number;
	successfulManualCheckIns: number;
	successfulQrScans: number;
};

type Agent = {
	_id: string;
	name: string;
	email: string;
	createdAt: string;
};

type DashboardDataType = {
	totalAttendeesCount: number;
	checkedInAttendeesCount: number;
	totalAgentsCount: number;
	pendingApprovalsCount: number;
};

type TabType =
	| "pending"
	| "attendees"
	| "agents"
	| "manual"
	| "invite"
	| "preconference";

// ── Attendees query params (mirrors the server) ───────────────────────────────
type AttendeesQuery = {
	search: string;
	status: "all" | "pending" | "confirmed" | "declined";
	checkIn: "all" | "checked-in" | "not-checked-in";
	checkInSession: "any" | "pre-conference" | "main-conference";
	page: number;
	pageSize: number;
};

const DEFAULT_QUERY: AttendeesQuery = {
	search: "",
	status: "all",
	checkIn: "all",
	checkInSession: "any",
	page: 1,
	pageSize: 50,
};

export default function AdminDashboardPage() {
	const router = useRouter();
	const { user, logout } = useAuth();
	const [activeTab, setActiveTab] = useState<TabType>("pending");

	// ── Attendees (paginated) ─────────────────────────────────────────────────
	const [attendeesResult, setAttendeesResult] = useState<PaginatedAttendees>({
		data: [],
		page: 1,
		pageSize: 50,
		total: 0,
		totalPages: 1,
	});
	const [attendeesQuery, setAttendeesQuery] =
		useState<AttendeesQuery>(DEFAULT_QUERY);
	// Debounce ref so we don't fire on every keystroke
	const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [agents, setAgents] = useState<Agent[]>([]);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);
	const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(
		null,
	);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editedTicketType, setEditedTicketType] = useState<string>("");
	const [imageSrc, setImageSrc] = useState<string | null>(null);
	const [imageLoading, setImageLoading] = useState(false);
	const [imageError, setImageError] = useState<string | null>(null);
	const [imageMimeType, setImageMimeType] = useState<string | null>(null);

	// ── Pending tab local filter (client-side, small list) ────────────────────
	const [pendingFilter, setPendingFilter] = useState("all");

	const [preConferenceSubTab, setPreConferenceSubTab] = useState<
		"researcher" | "referral" | "all"
	>("researcher");
	const [researcherPremiumAttendees, setResearcherPremiumAttendees] = useState<
		Attendee[]
	>([]);

	const [manualSubTab, setManualSubTab] = useState<
		"full" | "with-tickets" | "instant"
	>("full");
	const [quickForm, setQuickForm] = useState({
		name: "",
		email: "",
		ticketType: "Student Pass",
		sendBothTickets: false,
	});

	type InstantFormState = {
		name: string;
		email: string;
		ticketType: string;
		sessionType: "pre-conference" | "main-conference";
	};

	const [instantForm, setInstantForm] = useState<InstantFormState>({
		name: "",
		email: "",
		ticketType: "Student Pass",
		sessionType: "pre-conference",
	});

	const [confirmState, setConfirmState] = useState<
		| { open: false }
		| {
				open: true;
				action:
					| "approve"
					| "decline"
					| "sendPreConferenceInvite"
					| "manualCheckIn";
				attendee: Attendee;
				sessionType?: "pre-conference" | "main-conference";
		  }
	>({ open: false });
	const [confirmLoading, setConfirmLoading] = useState(false);

	const [selectedAgentId, setSelectedAgentId] = useState<string>("");
	const [agentScanHistory, setAgentScanHistory] = useState<ScanHistoryItem[]>(
		[],
	);
	const [agentScanStats, setAgentScanStats] = useState<ScanHistoryStats | null>(
		null,
	);
	const [agentScanLoading, setAgentScanLoading] = useState(false);
	const [agentScanError, setAgentScanError] = useState<string | null>(null);

	const [dashboardData, setDashboardData] = useState<DashboardDataType>({
		totalAttendeesCount: 0,
		checkedInAttendeesCount: 0,
		totalAgentsCount: 0,
		pendingApprovalsCount: 0,
	});

	// Manual registration form
	const [manualForm, setManualForm] = useState({
		name: "",
		email: "",
		phoneNumber: "",
		ticketType: "Student Pass",
		department: "",
		designation: "",
		wantsPreConference: false,
	});

	// Invite form
	const [inviteForm, setInviteForm] = useState({
		name: "",
		email: "",
		phoneNumber: "",
		ticketType: "Student Pass",
		designation: "",
		department: "",
	});

	// Agent form
	const [agentForm, setAgentForm] = useState({ name: "", email: "" });

	// ── Helpers ───────────────────────────────────────────────────────────────
	const formatDateTime = (value?: string) => {
		if (!value) return "";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return String(value);
		return date.toLocaleString();
	};

	const renderSourceBadge = (source?: "qr" | "manual") => {
		if (!source) return null;
		const isManual = source === "manual";
		return (
			<span
				className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
					isManual
						? "bg-indigo-100 text-indigo-800"
						: "bg-emerald-100 text-emerald-800"
				}`}
			>
				{isManual ? "Manual" : "QR"}
			</span>
		);
	};

	// ── Data fetchers ─────────────────────────────────────────────────────────
	/**
	 * Core paginated attendees fetch – passes all query params to the server.
	 * `query` overrides the current `attendeesQuery`; pass partial updates.
	 */
	const fetchAttendees = useCallback(
		async (overrides: Partial<AttendeesQuery> = {}) => {
			setLoading(true);
			try {
				const q = { ...attendeesQuery, ...overrides };

				// Build query string using .set() to avoid the ts(2554) overload error
				const params = new URLSearchParams();
				params.set("search", q.search);
				params.set("status", q.status);
				params.set("checkIn", q.checkIn);
				params.set("checkInSession", q.checkInSession);
				params.set("page", String(q.page));
				params.set("pageSize", String(q.pageSize));

				const res = await adminApi.getAllAttendees(params.toString());

				// Axios wraps the response body in res.data.
				// Server returns: { success, data: [...], page, pageSize, total, totalPages }
				const body = res?.data ?? res;

				if (Array.isArray(body)) {
					// Legacy plain-array shape
					setAttendeesResult({
						data: body,
						page: 1,
						pageSize: body.length,
						total: body.length,
						totalPages: 1,
					});
				} else if (Array.isArray(body?.data)) {
					// New paginated shape
					setAttendeesResult({
						data: body.data,
						page: body.page ?? 1,
						pageSize: body.pageSize ?? q.pageSize,
						total: body.total ?? body.data.length,
						totalPages: body.totalPages ?? 1,
					});
				} else {
					setAttendeesResult({
						data: [],
						page: 1,
						pageSize: q.pageSize,
						total: 0,
						totalPages: 1,
					});
				}
			} catch {
				setMessage({ type: "error", text: "Failed to load attendees" });
			} finally {
				setLoading(false);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[attendeesQuery],
	);

	/** Update a query field AND reset to page 1, then re-fetch. */
	const updateQuery = useCallback(
		(patch: Partial<AttendeesQuery>) => {
			const next = { ...attendeesQuery, ...patch, page: patch.page ?? 1 };
			setAttendeesQuery(next);
			fetchAttendees(next);
		},
		[attendeesQuery, fetchAttendees],
	);

	const fetchAgentScanHistory = useCallback(async (agentId: string) => {
		if (!agentId) {
			setAgentScanHistory([]);
			setAgentScanStats(null);
			return;
		}
		setAgentScanLoading(true);
		setAgentScanError(null);
		try {
			const res = await adminApi.getAgentScanHistory(agentId);
			const data = res?.data;
			setAgentScanHistory(Array.isArray(data?.history) ? data.history : []);
			setAgentScanStats(data?.stats ?? null);
		} catch (error) {
			console.error("Failed to fetch agent scan history:", error);
			setAgentScanError("Failed to load scan history");
			setAgentScanHistory([]);
			setAgentScanStats(null);
		} finally {
			setAgentScanLoading(false);
		}
	}, []);

	// ── Payment proof image ───────────────────────────────────────────────────
	useEffect(() => {
		if (selectedAttendee?.paymentProof) {
			let objectUrl: string;
			const fetchImage = async () => {
				setImageLoading(true);
				setImageError(null);
				setImageMimeType(null);
				setImageSrc(null);
				try {
					const response = await fetch(selectedAttendee.paymentProof!, {
						credentials: "include",
						headers: { Accept: "image/*,application/pdf;q=0.9,*/*;q=0.8" },
					});
					if (!response.ok)
						throw new Error(`Failed to load receipt (HTTP ${response.status})`);
					const blob = await response.blob();
					setImageMimeType(blob.type || null);
					objectUrl = URL.createObjectURL(blob);
					setImageSrc(objectUrl);
				} catch (error) {
					setImageSrc(null);
					setImageError(
						error instanceof Error ? error.message : "Failed to load receipt",
					);
				} finally {
					setImageLoading(false);
				}
			};
			fetchImage();
			return () => {
				if (objectUrl) URL.revokeObjectURL(objectUrl);
			};
		}
		setImageSrc(null);
		setImageError(null);
		setImageMimeType(null);
		setImageLoading(false);
	}, [selectedAttendee]);

	// ── Auth guard ────────────────────────────────────────────────────────────
	useEffect(() => {
		if (!user || user.role !== "admin") router.push("/login");
	}, [user, router]);

	const fetchAgents = useCallback(async () => {
		setLoading(true);
		try {
			const res = await adminApi.getAgents();
			setAgents(res.data || res || []);
		} catch {
			setMessage({ type: "error", text: "Failed to load agents" });
		} finally {
			setLoading(false);
		}
	}, []);

	const fetchResearcherPremium = useCallback(async () => {
		setLoading(true);
		try {
			const res = await adminApi.getResearcherPremiumAttendees();
			setResearcherPremiumAttendees(res.data || res || []);
		} catch {
			setMessage({
				type: "error",
				text: "Failed to load researcher premium attendees",
			});
		} finally {
			setLoading(false);
		}
	}, []);

	const fetchDashboardData = useCallback(async () => {
		setLoading(true);
		try {
			const res = await adminApi.getDashboardData();
			setDashboardData(res.data || res || {});
		} catch {
			setMessage({ type: "error", text: "Failed to load dashboard data" });
		} finally {
			setLoading(false);
		}
	}, []);

	// ── Tab-based data loading ────────────────────────────────────────────────
	useEffect(() => {
		fetchDashboardData().catch(() => {});
		if (activeTab === "pending") {
			// Pending tab fetches its own filtered set
			fetchAttendees({ status: "pending", page: 1 }).catch(() => {});
		} else if (activeTab === "attendees") {
			fetchAttendees().catch(() => {});
		} else if (activeTab === "agents") {
			fetchAgents().catch(() => {});
		} else if (activeTab === "preconference") {
			fetchResearcherPremium().catch(() => {});
			fetchAttendees().catch(() => {});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTab]);

	// ── Actions ───────────────────────────────────────────────────────────────
	async function approveAttendee(
		id: string,
		ticketType: string,
		sessionType?: "pre-conference" | "main-conference",
	) {
		try {
			await adminApi.approveRegistration(id, { ticketType, sessionType });
			setMessage({
				type: "success",
				text: "Attendee approved! QR code sent via email.",
			});
			fetchAttendees();
			setIsModalOpen(false);
		} catch (err) {
			setMessage({
				type: "error",
				text: err instanceof Error ? err.message : "Failed to approve attendee",
			});
		}
	}

	async function declineAttendee(id: string) {
		try {
			await adminApi.declineRegistration(id);
			setMessage({ type: "success", text: "Attendee declined" });
			fetchAttendees();
		} catch {
			setMessage({ type: "error", text: "Failed to decline attendee" });
		}
	}

	async function handleSendPreConferenceInvite(attendeeId: string) {
		setLoading(true);
		try {
			await adminApi.sendPreConferenceInvite({ attendeeId });
			setMessage({ type: "success", text: "Pre-conference invite sent!" });
			fetchResearcherPremium();
		} catch (err) {
			setMessage({
				type: "error",
				text: err instanceof Error ? err.message : "Failed to send invite",
			});
		} finally {
			setLoading(false);
		}
	}

	async function handleConfirmAction() {
		if (!confirmState.open) return;
		setConfirmLoading(true);
		try {
			if (confirmState.action === "approve") {
				const ticketType =
					isModalOpen && selectedAttendee?._id === confirmState.attendee._id
						? editedTicketType
						: confirmState.attendee.ticketType;
				await approveAttendee(
					confirmState.attendee._id,
					ticketType,
					confirmState.sessionType,
				);
			} else if (confirmState.action === "sendPreConferenceInvite") {
				await handleSendPreConferenceInvite(confirmState.attendee._id);
			} else if (confirmState.action === "manualCheckIn") {
				if (confirmState.sessionType === "pre-conference") {
					await adminApi.manualCheckInPreConference(confirmState.attendee._id);
					setMessage({
						type: "success",
						text: "Pre-conference manual check-in successful.",
					});
				} else {
					await adminApi.manualCheckInMainConference(confirmState.attendee._id);
					setMessage({
						type: "success",
						text: "Main conference manual check-in successful.",
					});
				}
				fetchAttendees();
			} else {
				await declineAttendee(confirmState.attendee._id);
				if (isModalOpen && selectedAttendee?._id === confirmState.attendee._id)
					setIsModalOpen(false);
			}
			setConfirmState({ open: false });
		} finally {
			setConfirmLoading(false);
		}
	}

	async function handleManualRegister(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		try {
			await adminApi.manualRegister(manualForm);
			setMessage({
				type: "success",
				text: "Attendee registered! QR code(s) sent via email.",
			});
			setManualForm({
				name: "",
				email: "",
				phoneNumber: "",
				ticketType: "Student Pass",
				department: "",
				designation: "",
				wantsPreConference: false,
			});
			setActiveTab("attendees");
			fetchAttendees();
		} catch (err) {
			setMessage({
				type: "error",
				text:
					err instanceof Error ? err.message : "Failed to register attendee",
			});
		} finally {
			setLoading(false);
		}
	}

	async function handleQuickWithTickets(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		try {
			await adminApi.quickRegisterWithTickets(quickForm);
			setMessage({
				type: "success",
				text: "Attendee registered! Tickets sent via email.",
			});
			setQuickForm({
				name: "",
				email: "",
				ticketType: "Student Pass",
				sendBothTickets: false,
			});
			fetchAttendees();
		} catch (err) {
			setMessage({
				type: "error",
				text:
					err instanceof Error ? err.message : "Failed to register attendee",
			});
		} finally {
			setLoading(false);
		}
	}

	async function handleInstantCheckIn(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		try {
			await adminApi.instantCheckIn(instantForm);
			setMessage({
				type: "success",
				text: "Attendee registered and checked in successfully!",
			});
			setInstantForm({
				name: "",
				email: "",
				ticketType: "Student Pass",
				sessionType: "pre-conference",
			});
			fetchAttendees();
		} catch (err) {
			setMessage({
				type: "error",
				text:
					err instanceof Error ? err.message : "Failed to check in attendee",
			});
		} finally {
			setLoading(false);
		}
	}

	async function handleInvite(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		const { name, email, phoneNumber, ticketType, designation } = inviteForm;
		if (name && email && phoneNumber && ticketType && designation) {
			setMessage({
				type: "error",
				text: "All required fields are filled. Please use the Manual Register tab for complete registrations.",
			});
			setLoading(false);
			return;
		}
		try {
			await adminApi.inviteAttendee(inviteForm);
			setMessage({ type: "success", text: "Invitation sent!" });
			setInviteForm({
				name: "",
				email: "",
				phoneNumber: "",
				ticketType: "Student Pass",
				designation: "",
				department: "",
			});
		} catch (err) {
			setMessage({
				type: "error",
				text: err instanceof Error ? err.message : "Failed to send invitation",
			});
		} finally {
			setLoading(false);
		}
	}

	async function handleAddAgent(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		try {
			await adminApi.createAgent(agentForm);
			setMessage({
				type: "success",
				text: "Agent added! Credentials sent via email.",
			});
			setAgentForm({ name: "", email: "" });
			fetchAgents();
		} catch (err) {
			setMessage({
				type: "error",
				text: err instanceof Error ? err.message : "Failed to add agent",
			});
		} finally {
			setLoading(false);
		}
	}

	async function handleLogout() {
		await logout();
		router.push("/login");
	}

	// ── Derived data ──────────────────────────────────────────────────────────
	// For the pending tab we keep a simple local filter (list is small, already
	// server-filtered to status=pending).
	const pendingAttendees = attendeesResult.data.filter(
		(a) => a.paymentStatus === "pending",
	);
	const displayedPending =
		pendingFilter === "all"
			? pendingAttendees
			: pendingFilter === "lecturer"
				? pendingAttendees.filter((a) => a.ticketType === "Lecturer Premium")
				: pendingAttendees.filter((a) => a.referralCode);

	const tabs = [
		{
			id: "pending" as TabType,
			label: "Pending Approvals",
			count: dashboardData.pendingApprovalsCount,
		},
		{
			id: "attendees" as TabType,
			label: "All Attendees",
			count: dashboardData.totalAttendeesCount,
		},
		{
			id: "agents" as TabType,
			label: "Agents",
			count: dashboardData.totalAgentsCount,
		},
		{ id: "manual" as TabType, label: "Manual Register" },
		{ id: "invite" as TabType, label: "Invite User" },
		{ id: "preconference" as TabType, label: "Pre-Conference" },
	];

	// ── Pagination helper ─────────────────────────────────────────────────────
	const PaginationControls = () => {
		const { page, totalPages, total, pageSize } = attendeesResult;
		const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
		const to = Math.min(page * pageSize, total);

		return (
			<div className='flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t mt-4'>
				<p className='text-sm text-zinc-500'>
					{total === 0
						? "No results"
						: `Showing ${from}–${to} of ${total} attendees`}
				</p>
				<div className='flex items-center gap-2'>
					<select
						className='rounded-lg border border-zinc-300 px-2 py-1.5 text-sm'
						value={pageSize}
						onChange={(e) =>
							updateQuery({ pageSize: Number(e.target.value), page: 1 })
						}
					>
						{[25, 50, 100, 200].map((n) => (
							<option key={n} value={n}>
								{n} / page
							</option>
						))}
					</select>
					<Button
						variant='outline'
						disabled={page <= 1 || loading}
						onClick={() => updateQuery({ page: page - 1 })}
					>
						← Prev
					</Button>
					<span className='text-sm font-medium text-zinc-700'>
						{page} / {totalPages || 1}
					</span>
					<Button
						variant='outline'
						disabled={page >= totalPages || loading}
						onClick={() => updateQuery({ page: page + 1 })}
					>
						Next →
					</Button>
				</div>
			</div>
		);
	};

	// ─────────────────────────────────────────────────────────────────────────
	return (
		<div className='min-h-screen bg-linear-to-br from-purple-50 via-indigo-50 to-white'>
			<ConfirmDialog
				open={confirmState.open}
				title={
					confirmState.open
						? confirmState.action === "approve"
							? "Approve payment?"
							: confirmState.action === "manualCheckIn"
								? confirmState.sessionType === "pre-conference"
									? "Confirm pre-conference manual check-in?"
									: "Confirm main conference manual check-in?"
								: confirmState.action === "sendPreConferenceInvite"
									? "Send pre-conference invite?"
									: "Decline payment?"
						: ""
				}
				description={
					confirmState.open ? (
						<div className='space-y-2'>
							<div>
								You're about to{" "}
								<span className='font-medium'>
									{confirmState.action === "sendPreConferenceInvite"
										? "send a pre-conference invite"
										: `${confirmState.action} payment`}
								</span>{" "}
								for:
							</div>
							<div className='rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm'>
								<div className='font-medium text-zinc-900'>
									{confirmState.attendee.name}
								</div>
								<div className='text-zinc-600'>
									{confirmState.attendee.email}
								</div>
								<div className='text-zinc-600'>
									Ticket: {confirmState.attendee.ticketType}
								</div>
							</div>
							{confirmState.action === "decline" ? (
								<div className='text-sm text-zinc-600'>
									This will mark the payment as declined.
								</div>
							) : confirmState.action === "manualCheckIn" ? (
								<div className='text-sm text-red-600'>
									This action is not reversible. Please confirm you're checking
									in the correct person.
								</div>
							) : confirmState.action === "sendPreConferenceInvite" ? (
								<div className='text-sm text-zinc-600'>
									This will send an email to the user with a link to respond to
									the pre-conference invite.
								</div>
							) : (
								<div className='text-sm text-zinc-600'>
									This will approve the payment and send the QR code via email.
								</div>
							)}
						</div>
					) : null
				}
				confirmText={
					confirmState.open
						? confirmState.action === "approve"
							? "Approve"
							: confirmState.action === "manualCheckIn"
								? confirmState.sessionType === "pre-conference"
									? "Check in (Pre-Conf)"
									: "Check in (Main Conf)"
								: confirmState.action === "sendPreConferenceInvite"
									? "Send Invite"
									: "Decline"
						: "Confirm"
				}
				cancelText='Cancel'
				variant={
					confirmState.open &&
					(confirmState.action === "decline" ||
						confirmState.action === "manualCheckIn")
						? "danger"
						: "default"
				}
				loading={confirmLoading}
				onCancel={() =>
					confirmLoading ? null : setConfirmState({ open: false })
				}
				onConfirm={handleConfirmAction}
			/>

			{/* Header */}
			<header className='bg-white/80 backdrop-blur border-b border-zinc-200 sticky top-0 z-10'>
				<div className='max-w-7xl mx-auto px-4 py-4 flex items-center justify-between'>
					<div className='flex items-center gap-3'>
						<Logo size={48} />
						<div>
							<h1 className='text-xl font-bold text-zinc-900'>
								Admin Dashboard
							</h1>
							<p className='text-xs text-zinc-500'>
								Welcome, {user?.name || "Admin"}
							</p>
						</div>
					</div>
					<Button variant='outline' onClick={handleLogout}>
						Logout
					</Button>
				</div>
			</header>

			<div className='max-w-7xl mx-auto px-4 py-6'>
				{/* Message */}
				{message && (
					<div
						className={`mb-4 rounded-lg p-4 text-sm ${
							message.type === "success"
								? "bg-green-50 border border-green-200 text-green-700"
								: "bg-red-50 border border-red-200 text-red-700"
						}`}
					>
						{message.text}
						<button onClick={() => setMessage(null)} className='ml-4 underline'>
							Dismiss
						</button>
					</div>
				)}

				{/* Tabs */}
				<div className='flex flex-wrap gap-2 mb-6'>
					{tabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
								activeTab === tab.id
									? "bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow"
									: "bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200"
							}`}
						>
							{tab.label}
							{tab.count !== undefined && (
								<span className='ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs'>
									{tab.count}
								</span>
							)}
						</button>
					))}
				</div>

				{/* Content */}
				<div className='bg-white rounded-2xl shadow-xl p-6'>
					{/* ── Pending Approvals ─────────────────────────────────────────── */}
					{activeTab === "pending" && (
						<div>
							<h2 className='text-lg font-semibold mb-4'>
								Pending Payment Approvals
							</h2>
							{loading ? (
								<p className='text-zinc-500'>Loading...</p>
							) : pendingAttendees.length === 0 ? (
								<p className='text-zinc-500'>No pending approvals</p>
							) : (
								<div className='space-y-4'>
									<div className='flex gap-2 mb-4'>
										<Button
											variant={pendingFilter === "all" ? "default" : "outline"}
											onClick={() => setPendingFilter("all")}
										>
											All ({pendingAttendees.length})
										</Button>
										<Button
											variant={
												pendingFilter === "lecturer" ? "default" : "outline"
											}
											onClick={() => setPendingFilter("lecturer")}
										>
											Lecturer Premium (
											{
												pendingAttendees.filter(
													(a) => a.ticketType === "Lecturer Premium",
												).length
											}
											)
										</Button>
										<Button
											variant={
												pendingFilter === "referral" ? "default" : "outline"
											}
											onClick={() => setPendingFilter("referral")}
										>
											By Referral (
											{pendingAttendees.filter((a) => a.referralCode).length})
										</Button>
									</div>

									{displayedPending.map((attendee) => (
										<div
											key={attendee._id}
											className='border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4'
										>
											<div>
												<p className='font-medium text-zinc-900'>
													{attendee.name}
												</p>
												<p className='text-sm text-zinc-500'>
													{attendee.email}
												</p>
												<p className='text-xs text-zinc-400'>
													{attendee.ticketType} •{" "}
													{attendee.department || "No department"} •{" "}
													{new Date(attendee.createdAt).toLocaleDateString()}
												</p>
											</div>
											<div className='flex gap-2'>
												<Button
													onClick={() => {
														setSelectedAttendee(attendee);
														setEditedTicketType(attendee.ticketType);
														setIsModalOpen(true);
													}}
													variant='outline'
												>
													View Details
												</Button>
												{!(
													attendee.ticketType === "Lecturer Premium" &&
													(attendee.preConferenceQrCode ||
														attendee.mainConferenceQrCode)
												) && (
													<Button
														onClick={() =>
															setConfirmState({
																open: true,
																action: "decline",
																attendee,
															})
														}
														variant='outline'
														className='text-red-600 border-red-300 hover:bg-red-50'
													>
														Decline
													</Button>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{/* ── Attendee Details Modal ────────────────────────────────────── */}
					{isModalOpen && selectedAttendee && (
						<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20 px-4'>
							<div className='bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto'>
								<h2 className='text-lg font-semibold mb-4'>Attendee Details</h2>
								<div className='space-y-4'>
									<p>
										<strong>Name:</strong> {selectedAttendee.name}
									</p>
									<p>
										<strong>Email:</strong> {selectedAttendee.email}
									</p>
									<p>
										<strong>Phone:</strong> {selectedAttendee.phoneNumber}
									</p>
									<p>
										<strong>Designation:</strong> {selectedAttendee.designation}
									</p>
									<p>
										<strong>Department:</strong>{" "}
										{selectedAttendee.department || "N/A"}
									</p>
									<p>
										<strong>Referral Code:</strong>{" "}
										{selectedAttendee.referralCode || "N/A"}
									</p>
									<div>
										<label className='block text-sm font-medium text-zinc-700 mb-1'>
											Ticket Type
										</label>
										<select
											value={editedTicketType}
											onChange={(e) => setEditedTicketType(e.target.value)}
											className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
										>
											<option value='Student Pass'>
												Student Pass (₦1,000)
											</option>
											<option value='Researcher Standard'>
												Researcher Standard (₦3,000)
											</option>
											<option value='Researcher Premium'>
												Researcher Premium (₦6,000)
											</option>
											<option value='Lecturer Premium'>
												Lecturer Premium (₦6,000)
											</option>
										</select>
									</div>

									{selectedAttendee.ticketType === "Researcher Premium" && (
										<p>
											<strong>Pre-Conference:</strong>{" "}
											{selectedAttendee.wantsPreConference === true
												? "Yes (wants to attend)"
												: selectedAttendee.preConferenceDeclinedDuringReg
													? "No (declined during registration)"
													: selectedAttendee.preConferenceInviteSent
														? `Invite sent - ${selectedAttendee.preConferenceInviteResponse || "pending"}`
														: "Not yet invited"}
										</p>
									)}

									{selectedAttendee.paymentProof && (
										<div className='mt-4'>
											<p className='font-medium mb-2'>Payment Receipt</p>
											{imageLoading ? (
												<p className='text-sm text-zinc-500'>
													Loading receipt…
												</p>
											) : imageError ? (
												<div className='rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
													<div className='font-medium mb-1'>
														Couldn't load receipt
													</div>
													<div className='text-red-700/90'>{imageError}</div>
													<div className='mt-2'>
														<a
															href={selectedAttendee.paymentProof}
															target='_blank'
															rel='noreferrer'
															className='underline'
														>
															Open receipt in a new tab
														</a>
													</div>
												</div>
											) : imageSrc ? (
												imageMimeType?.includes("pdf") ? (
													<div className='rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm'>
														<p className='text-zinc-700'>
															This receipt is a PDF.
														</p>
														<a
															href={imageSrc}
															target='_blank'
															rel='noreferrer'
															className='mt-1 inline-block underline'
														>
															Open PDF
														</a>
													</div>
												) : (
													// eslint-disable-next-line @next/next/no-img-element
													<img
														src={imageSrc}
														alt='Payment Receipt'
														className='w-full h-auto rounded-lg border border-zinc-200 bg-white'
														loading='lazy'
													/>
												)
											) : (
												<div className='rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600'>
													No receipt preview available.
													<div className='mt-1'>
														<a
															href={selectedAttendee.paymentProof}
															target='_blank'
															rel='noreferrer'
															className='underline'
														>
															Open receipt
														</a>
													</div>
												</div>
											)}
										</div>
									)}

									<div className='flex gap-2 justify-end pt-4 sticky bottom-0 bg-white z-10 py-2'>
										<Button
											variant='outline'
											onClick={() => setIsModalOpen(false)}
										>
											Close
										</Button>
										{activeTab !== "preconference" && (
											<>
												{selectedAttendee.ticketType === "Lecturer Premium" ||
												(selectedAttendee.ticketType === "Researcher Premium" &&
													selectedAttendee.wantsPreConference) ? (
													<>
														{!selectedAttendee.preConferenceQrCode && (
															<Button
																onClick={() =>
																	setConfirmState({
																		open: true,
																		action: "approve",
																		attendee: selectedAttendee,
																		sessionType: "pre-conference",
																	})
																}
																className='bg-blue-600 hover:bg-blue-700'
															>
																Approve Pre-Conference
															</Button>
														)}
														{!selectedAttendee.mainConferenceQrCode && (
															<Button
																onClick={() =>
																	setConfirmState({
																		open: true,
																		action: "approve",
																		attendee: selectedAttendee,
																		sessionType: "main-conference",
																	})
																}
																className='bg-green-600 hover:bg-green-700'
															>
																Approve Main Conference
															</Button>
														)}
													</>
												) : (
													<Button
														onClick={() =>
															setConfirmState({
																open: true,
																action: "approve",
																attendee: selectedAttendee,
															})
														}
														className='bg-green-600 hover:bg-green-700'
													>
														Approve
													</Button>
												)}
											</>
										)}
									</div>
								</div>
							</div>
						</div>
					)}

					{/* ── All Attendees (server-side search / filter / paginate) ──────── */}
					{activeTab === "attendees" && (
						<div>
							<h2 className='text-lg font-semibold mb-4'>All Attendees</h2>

							{/* ── Search + filters bar ────────────────────────────────── */}
							<div className='flex flex-col sm:flex-row gap-3 mb-4'>
								{/* Search */}
								<div className='flex-1 relative'>
									<input
										type='text'
										placeholder='Search by name or email…'
										defaultValue={attendeesQuery.search}
										onChange={(e) => {
											const val = e.target.value;
											if (searchDebounceRef.current)
												clearTimeout(searchDebounceRef.current);
											searchDebounceRef.current = setTimeout(() => {
												updateQuery({ search: val, page: 1 });
											}, 350);
										}}
										className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm pl-9'
									/>
									<svg
										className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400'
										fill='none'
										viewBox='0 0 24 24'
										stroke='currentColor'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z'
										/>
									</svg>
								</div>

								{/* Payment status filter */}
								<select
									value={attendeesQuery.status}
									onChange={(e) =>
										updateQuery({
											status: e.target.value as AttendeesQuery["status"],
											page: 1,
										})
									}
									className='rounded-lg border border-zinc-300 px-3 py-2.5 text-sm'
								>
									<option value='all'>All statuses</option>
									<option value='pending'>Pending</option>
									<option value='confirmed'>Confirmed</option>
									<option value='declined'>Declined</option>
								</select>

								{/* Check-in status filter */}
								<select
									value={attendeesQuery.checkIn}
									onChange={(e) =>
										updateQuery({
											checkIn: e.target.value as AttendeesQuery["checkIn"],
											page: 1,
										})
									}
									className='rounded-lg border border-zinc-300 px-3 py-2.5 text-sm'
								>
									<option value='all'>All check-in</option>
									<option value='checked-in'>Checked in</option>
									<option value='not-checked-in'>Not checked in</option>
								</select>

								{/* Session filter (only meaningful when checkIn ≠ all) */}
								{attendeesQuery.checkIn !== "all" && (
									<select
										value={attendeesQuery.checkInSession}
										onChange={(e) =>
											updateQuery({
												checkInSession: e.target
													.value as AttendeesQuery["checkInSession"],
												page: 1,
											})
										}
										className='rounded-lg border border-zinc-300 px-3 py-2.5 text-sm'
									>
										<option value='any'>Any session</option>
										<option value='pre-conference'>Pre-conference</option>
										<option value='main-conference'>Main conference</option>
									</select>
								)}

								{/* Reset */}
								{(attendeesQuery.search ||
									attendeesQuery.status !== "all" ||
									attendeesQuery.checkIn !== "all") && (
									<Button
										variant='outline'
										onClick={() => {
											setAttendeesQuery(DEFAULT_QUERY);
											fetchAttendees(DEFAULT_QUERY);
										}}
									>
										Reset
									</Button>
								)}
							</div>

							{/* ── Results summary ─────────────────────────────────────── */}
							{loading ? (
								<p className='text-zinc-500'>Loading...</p>
							) : attendeesResult.data.length === 0 ? (
								<p className='text-zinc-500'>No attendees match your filters</p>
							) : (
								<>
									<div className='overflow-x-auto'>
										<table className='w-full text-sm'>
											<thead>
												<tr className='border-b bg-zinc-50'>
													<th className='text-left p-3'>Name</th>
													<th className='text-left p-3'>Email</th>
													<th className='text-left p-3'>Ticket</th>
													<th className='text-left p-3'>Status</th>
													<th className='text-center p-3'>Pre-Conf (Jan 20)</th>
													<th className='text-center p-3'>
														Main Conf (Jan 21)
													</th>
												</tr>
											</thead>
											<tbody>
												{attendeesResult.data.map((a) => (
													<tr key={a._id} className='border-b hover:bg-zinc-50'>
														<td className='p-3'>{a.name}</td>
														<td className='p-3 text-zinc-500'>{a.email}</td>
														<td className='p-3 capitalize'>{a.ticketType}</td>
														<td className='p-3'>
															<span
																className={`px-2 py-1 rounded-full text-xs ${
																	a.paymentStatus === "confirmed"
																		? "bg-green-100 text-green-700"
																		: a.paymentStatus === "pending"
																			? "bg-yellow-100 text-yellow-700"
																			: "bg-red-100 text-red-700"
																}`}
															>
																{a.paymentStatus}
															</span>
														</td>
														<td className='p-3 text-center'>
															{a.ticketType === "Lecturer Premium" ||
															(a.ticketType === "Researcher Premium" &&
																a.preConferenceQrCode) ? (
																a.preConferenceCheckInStatus ===
																"checked-in" ? (
																	<div className='inline-flex flex-col items-center gap-1'>
																		<span>✅</span>
																		{renderSourceBadge(
																			a.preConferenceCheckInSource,
																		)}
																	</div>
																) : (
																	<Button
																		size='sm'
																		variant='outline'
																		onClick={() =>
																			setConfirmState({
																				open: true,
																				action: "manualCheckIn",
																				attendee: a,
																				sessionType: "pre-conference",
																			})
																		}
																	>
																		Check in
																	</Button>
																)
															) : (
																<span className='text-zinc-400'>N/A</span>
															)}
														</td>
														<td className='p-3 text-center'>
															{a.ticketType === "Lecturer Premium" ||
															(a.ticketType === "Researcher Premium" &&
																a.preConferenceQrCode) ? (
																a.mainConferenceCheckInStatus ===
																"checked-in" ? (
																	<div className='inline-flex flex-col items-center gap-1'>
																		<span>✅</span>
																		{renderSourceBadge(
																			a.mainConferenceCheckInSource,
																		)}
																	</div>
																) : (
																	<Button
																		size='sm'
																		variant='outline'
																		onClick={() =>
																			setConfirmState({
																				open: true,
																				action: "manualCheckIn",
																				attendee: a,
																				sessionType: "main-conference",
																			})
																		}
																	>
																		Check in
																	</Button>
																)
															) : a.checkInStatus === "checked-in" ? (
																<div className='inline-flex flex-col items-center gap-1'>
																	<span>✅</span>
																	{renderSourceBadge(
																		a.mainConferenceCheckInSource,
																	)}
																</div>
															) : (
																<Button
																	size='sm'
																	variant='outline'
																	onClick={() =>
																		setConfirmState({
																			open: true,
																			action: "manualCheckIn",
																			attendee: a,
																			sessionType: "main-conference",
																		})
																	}
																>
																	Check in
																</Button>
															)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
									<PaginationControls />
								</>
							)}
						</div>
					)}

					{/* ── Agents ────────────────────────────────────────────────────── */}
					{activeTab === "agents" && (
						<div className='space-y-6'>
							<div>
								<h2 className='text-lg font-semibold mb-4'>Add New Agent</h2>
								<form
									onSubmit={handleAddAgent}
									className='flex flex-col md:flex-row gap-4'
								>
									<input
										type='text'
										value={agentForm.name}
										onChange={(e) =>
											setAgentForm({ ...agentForm, name: e.target.value })
										}
										placeholder='Full name'
										className='flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
										required
									/>
									<input
										type='email'
										value={agentForm.email}
										onChange={(e) =>
											setAgentForm({ ...agentForm, email: e.target.value })
										}
										placeholder='Email'
										className='flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
										required
									/>
									<Button type='submit' disabled={loading}>
										{loading ? "Adding..." : "Add Agent"}
									</Button>
								</form>
							</div>

							<div className='border rounded-xl p-4 bg-white'>
								<div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
									<div>
										<h2 className='text-lg font-semibold'>
											Agent Scan History
										</h2>
										<p className='text-sm text-zinc-500'>
											View QR and manual check-ins (including failed scans).
										</p>
									</div>
									<div className='flex items-center gap-2'>
										<select
											className='rounded-lg border border-zinc-300 px-3 py-2 text-sm'
											value={selectedAgentId}
											onChange={(e) => {
												const next = e.target.value;
												setSelectedAgentId(next);
												fetchAgentScanHistory(next);
											}}
										>
											<option value=''>Select an agent…</option>
											{agents.map((a) => (
												<option key={a._id} value={a._id}>
													{a.name} ({a.email})
												</option>
											))}
										</select>
										<Button
											variant='outline'
											disabled={!selectedAgentId || agentScanLoading}
											onClick={() => fetchAgentScanHistory(selectedAgentId)}
										>
											{agentScanLoading ? "Loading…" : "Refresh"}
										</Button>
									</div>
								</div>

								{agentScanError && (
									<div className='mt-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm'>
										{agentScanError}
									</div>
								)}

								{selectedAgentId && agentScanStats && (
									<div className='mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
										<div className='rounded-lg border p-3'>
											<p className='text-xs text-zinc-500'>Total scans</p>
											<p className='text-xl font-semibold'>
												{agentScanStats.totalScans}
											</p>
										</div>
										<div className='rounded-lg border p-3'>
											<p className='text-xs text-zinc-500'>
												Successful check-ins
											</p>
											<p className='text-xl font-semibold'>
												{agentScanStats.successfulCheckIns}
											</p>
										</div>
										<div className='rounded-lg border p-3'>
											<p className='text-xs text-zinc-500'>Manual successes</p>
											<p className='text-xl font-semibold'>
												{agentScanStats.successfulManualCheckIns}
											</p>
										</div>
										<div className='rounded-lg border p-3'>
											<p className='text-xs text-zinc-500'>QR successes</p>
											<p className='text-xl font-semibold'>
												{agentScanStats.successfulQrScans}
											</p>
										</div>
									</div>
								)}

								{selectedAgentId && (
									<div className='mt-4'>
										{agentScanLoading ? (
											<p className='text-sm text-zinc-500'>
												Loading scan history…
											</p>
										) : agentScanHistory.length === 0 ? (
											<p className='text-sm text-zinc-500'>
												No scan logs found for this agent.
											</p>
										) : (
											<div className='space-y-2'>
												{agentScanHistory.map((log) => (
													<div
														key={log._id}
														className={`rounded-lg p-3 text-sm flex justify-between items-center ${
															log.scanStatus === "success"
																? "bg-green-50"
																: log.scanStatus === "already_scanned"
																	? "bg-yellow-50"
																	: "bg-red-50"
														}`}
													>
														<div className='min-w-0'>
															<p className='font-medium truncate'>{log.name}</p>
															<p className='text-xs text-zinc-600 truncate'>
																{log.email}
															</p>
															<p className='text-xs text-zinc-600'>
																{(log.sessionType || "").replace("-", " ")}
																{log.sessionType ? " • " : ""}
																{renderSourceBadge(log.scanSource)}
															</p>
															<p className='text-xs text-zinc-500'>
																{formatDateTime(log.scannedAt)}
															</p>
															{log.scanStatus !== "success" && log.message && (
																<p className='text-xs text-zinc-600'>
																	{log.message}
																</p>
															)}
														</div>
														<span
															className={`ml-3 shrink-0 px-2 py-1 rounded-full text-xs ${
																log.scanStatus === "success"
																	? "bg-green-200 text-green-800"
																	: log.scanStatus === "already_scanned"
																		? "bg-yellow-200 text-yellow-800"
																		: "bg-red-200 text-red-800"
															}`}
														>
															{log.scanStatus === "success"
																? "Success"
																: log.scanStatus === "already_scanned"
																	? "Already"
																	: "Invalid"}
														</span>
													</div>
												))}
											</div>
										)}
									</div>
								)}
							</div>

							<div>
								<h2 className='text-lg font-semibold mb-4'>All Agents</h2>
								{agents.length === 0 ? (
									<p className='text-zinc-500'>No agents yet</p>
								) : (
									<div className='space-y-3'>
										{agents.map((agent) => (
											<div key={agent._id} className='border rounded-lg p-4'>
												<p className='font-medium'>{agent.name}</p>
												<p className='text-sm text-zinc-500'>{agent.email}</p>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					)}

					{/* ── Manual Register ────────────────────────────────────────────── */}
					{activeTab === "manual" && (
						<div>
							<h2 className='text-lg font-semibold mb-4'>
								Manual Registration
							</h2>
							<div className='flex gap-2 mb-6'>
								<Button
									variant={manualSubTab === "full" ? "default" : "outline"}
									onClick={() => setManualSubTab("full")}
								>
									With Full Info
								</Button>
								<Button
									variant={
										manualSubTab === "with-tickets" ? "default" : "outline"
									}
									onClick={() => setManualSubTab("with-tickets")}
								>
									Quick (With Tickets)
								</Button>
								<Button
									variant={manualSubTab === "instant" ? "default" : "outline"}
									onClick={() => setManualSubTab("instant")}
								>
									Instant (No Tickets)
								</Button>
							</div>

							{manualSubTab === "full" && (
								<div>
									<p className='text-sm text-zinc-500 mb-4'>
										Register an attendee with complete information. They will
										receive their QR code via email.
									</p>
									<form
										onSubmit={handleManualRegister}
										className='space-y-4 max-w-md'
									>
										<input
											type='text'
											value={manualForm.name}
											onChange={(e) =>
												setManualForm({ ...manualForm, name: e.target.value })
											}
											placeholder='Full name'
											className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
											required
										/>
										<input
											type='email'
											value={manualForm.email}
											onChange={(e) =>
												setManualForm({ ...manualForm, email: e.target.value })
											}
											placeholder='Email'
											className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
											required
										/>
										<input
											type='tel'
											value={manualForm.phoneNumber}
											onChange={(e) =>
												setManualForm({
													...manualForm,
													phoneNumber: e.target.value,
												})
											}
											placeholder='Phone number'
											className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
											required
										/>
										<input
											type='text'
											value={manualForm.designation}
											onChange={(e) =>
												setManualForm({
													...manualForm,
													designation: e.target.value,
												})
											}
											placeholder='Designation (e.g. PhD Student, Lecturer)'
											className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
											required
										/>
										<input
											type='text'
											value={manualForm.department}
											onChange={(e) =>
												setManualForm({
													...manualForm,
													department: e.target.value,
												})
											}
											placeholder='Department (optional)'
											className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
										/>
										<select
											value={manualForm.ticketType}
											onChange={(e) =>
												setManualForm({
													...manualForm,
													ticketType: e.target.value,
												})
											}
											className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
										>
											<option value='Student Pass'>
												Student Pass (₦1,000)
											</option>
											<option value='Researcher Standard'>
												Researcher Standard (₦3,000)
											</option>
											<option value='Researcher Premium'>
												Researcher Premium (₦6,000)
											</option>
											<option value='Lecturer Premium'>
												Lecturer Premium (₦6,000)
											</option>
										</select>
										{manualForm.ticketType === "Researcher Premium" && (
											<div className='p-3 rounded-lg bg-purple-50 border border-purple-200'>
												<label className='flex items-center gap-2'>
													<input
														type='checkbox'
														checked={manualForm.wantsPreConference}
														onChange={(e) =>
															setManualForm({
																...manualForm,
																wantsPreConference: e.target.checked,
															})
														}
														className='h-4 w-4'
													/>
													<span className='text-sm'>
														Include Pre-Conference ticket (both tickets will be
														sent)
													</span>
												</label>
											</div>
										)}
										<Button type='submit' disabled={loading} className='w-full'>
											{loading ? "Registering..." : "Register Attendee"}
										</Button>
									</form>
								</div>
							)}

							{manualSubTab === "with-tickets" && (
								<div>
									<p className='text-sm text-zinc-500 mb-4'>
										Quick registration with tickets sent via email. Minimal info
										required.
									</p>
									<form
										onSubmit={handleQuickWithTickets}
										className='space-y-4 max-w-md'
									>
										<input
											type='text'
											value={quickForm.name}
											onChange={(e) =>
												setQuickForm({ ...quickForm, name: e.target.value })
											}
											placeholder='Name (Optional)'
											className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
										/>
										<input
											type='email'
											value={quickForm.email}
											onChange={(e) =>
												setQuickForm({ ...quickForm, email: e.target.value })
											}
											placeholder='Email'
											className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
											required
										/>
										<select
											value={quickForm.ticketType}
											onChange={(e) =>
												setQuickForm({
													...quickForm,
													ticketType: e.target.value,
												})
											}
											className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
										>
											<option value='Student Pass'>
												Student Pass (₦1,000)
											</option>
											<option value='Researcher Standard'>
												Researcher Standard (₦3,000)
											</option>
											<option value='Researcher Premium'>
												Researcher Premium (₦6,000)
											</option>
											<option value='Lecturer Premium'>
												Lecturer Premium (₦6,000)
											</option>
										</select>
										{quickForm.ticketType === "Researcher Premium" && (
											<div className='p-3 rounded-lg bg-purple-50 border border-purple-200'>
												<label className='flex items-center gap-2'>
													<input
														type='checkbox'
														checked={quickForm.sendBothTickets}
														onChange={(e) =>
															setQuickForm({
																...quickForm,
																sendBothTickets: e.target.checked,
															})
														}
														className='h-4 w-4'
													/>
													<span className='text-sm'>
														Send both Pre-Conference and Main Conference tickets
													</span>
												</label>
											</div>
										)}
										<Button type='submit' disabled={loading} className='w-full'>
											{loading ? "Registering..." : "Register & Send Tickets"}
										</Button>
									</form>
								</div>
							)}

							{manualSubTab === "instant" && (
								<div>
									<p className='text-sm text-zinc-500 mb-4'>
										Instant registration and check-in. No tickets sent -
										attendee is checked in immediately.
									</p>
									<form
										onSubmit={handleInstantCheckIn}
										className='space-y-4 max-w-md'
									>
										<input
											type='text'
											value={instantForm.name}
											onChange={(e) =>
												setInstantForm({ ...instantForm, name: e.target.value })
											}
											placeholder='Name (Optional)'
											className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
										/>
										<input
											type='email'
											value={instantForm.email}
											onChange={(e) =>
												setInstantForm({
													...instantForm,
													email: e.target.value,
												})
											}
											placeholder='Email'
											className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
											required
										/>
										<select
											value={instantForm.ticketType}
											onChange={(e) =>
												setInstantForm({
													...instantForm,
													ticketType: e.target.value,
												})
											}
											className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
										>
											<option value='Student Pass'>
												Student Pass (₦1,000)
											</option>
											<option value='Researcher Standard'>
												Researcher Standard (₦3,000)
											</option>
											<option value='Researcher Premium'>
												Researcher Premium (₦6,000)
											</option>
											<option value='Lecturer Premium'>
												Lecturer Premium (₦6,000)
											</option>
										</select>
										{(instantForm.ticketType === "Researcher Premium" ||
											instantForm.ticketType === "Lecturer Premium") && (
											<div className='p-3 rounded-lg bg-purple-50 border border-purple-200'>
												<label className='block text-sm font-medium text-zinc-700 mb-1'>
													Session to Check In
												</label>
												<select
													value={instantForm.sessionType}
													onChange={(e) =>
														setInstantForm({
															...instantForm,
															sessionType: e.target.value as
																| "pre-conference"
																| "main-conference",
														})
													}
													className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
												>
													<option value='pre-conference'>Pre-Conference</option>
													<option value='main-conference'>
														Main Conference
													</option>
												</select>
												<p className='text-xs text-zinc-500 mt-2'>
													{instantForm.sessionType === "pre-conference"
														? "This will check the attendee in for the pre-conference and email them a ticket for the main conference."
														: "This will check the attendee in for the main conference. No email will be sent."}
												</p>
											</div>
										)}
										<Button type='submit' disabled={loading} className='w-full'>
											{loading ? "Processing..." : "Register & Check In Now"}
										</Button>
									</form>
								</div>
							)}
						</div>
					)}

					{/* ── Invite User ────────────────────────────────────────────────── */}
					{activeTab === "invite" && (
						<div>
							<h2 className='text-lg font-semibold mb-4'>Invite User</h2>
							<p className='text-sm text-zinc-500 mb-4'>
								Send an invitation link. The user will complete their
								registration.
							</p>
							<form onSubmit={handleInvite} className='space-y-4 max-w-md'>
								<input
									type='text'
									value={inviteForm.name}
									onChange={(e) =>
										setInviteForm({ ...inviteForm, name: e.target.value })
									}
									placeholder='Full name'
									className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
								/>
								<input
									type='email'
									value={inviteForm.email}
									onChange={(e) =>
										setInviteForm({ ...inviteForm, email: e.target.value })
									}
									placeholder='Email address'
									className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
									required
								/>
								<input
									type='tel'
									value={inviteForm.phoneNumber}
									onChange={(e) =>
										setInviteForm({
											...inviteForm,
											phoneNumber: e.target.value,
										})
									}
									placeholder='Phone number'
									className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
								/>
								<input
									type='text'
									value={inviteForm.designation}
									onChange={(e) =>
										setInviteForm({
											...inviteForm,
											designation: e.target.value,
										})
									}
									placeholder='Designation (e.g. PhD Student, Lecturer)'
									className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
								/>
								<input
									type='text'
									value={inviteForm.department}
									onChange={(e) =>
										setInviteForm({ ...inviteForm, department: e.target.value })
									}
									placeholder='Department (optional)'
									className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
								/>
								<select
									value={inviteForm.ticketType}
									onChange={(e) =>
										setInviteForm({ ...inviteForm, ticketType: e.target.value })
									}
									className='w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm'
								>
									<option value='Student Pass'>Student Pass (₦1,000)</option>
									<option value='Researcher Standard'>
										Researcher Standard (₦3,000)
									</option>
									<option value='Researcher Premium'>
										Researcher Premium (₦6,000)
									</option>
									<option value='Lecturer Premium'>
										Lecturer Premium (₦6,000)
									</option>
								</select>
								<Button type='submit' disabled={loading} className='w-full'>
									{loading ? "Sending..." : "Send Invitation"}
								</Button>
							</form>
						</div>
					)}

					{/* ── Pre-Conference ─────────────────────────────────────────────── */}
					{activeTab === "preconference" && (
						<div>
							<h2 className='text-lg font-semibold mb-4'>
								Pre-Conference Management
							</h2>
							<p className='text-sm text-zinc-500 mb-4'>
								Manage pre-conference session invitations for Researcher Premium
								attendees.
							</p>

							<div className='flex gap-2 mb-6'>
								<Button
									variant={
										preConferenceSubTab === "researcher" ? "default" : "outline"
									}
									onClick={() => setPreConferenceSubTab("researcher")}
								>
									Researcher Premium ({researcherPremiumAttendees.length})
								</Button>
								<Button
									variant={
										preConferenceSubTab === "referral" ? "default" : "outline"
									}
									onClick={() => setPreConferenceSubTab("referral")}
								>
									By Referral (
									{attendeesResult.data.filter((a) => a.referralCode).length})
								</Button>
								<Button
									variant={
										preConferenceSubTab === "all" ? "default" : "outline"
									}
									onClick={() => setPreConferenceSubTab("all")}
								>
									All Attendees ({attendeesResult.total})
								</Button>
							</div>

							{preConferenceSubTab === "researcher" && (
								<div>
									{loading ? (
										<p className='text-zinc-500'>Loading...</p>
									) : researcherPremiumAttendees.length === 0 ? (
										<p className='text-zinc-500'>
											No confirmed Researcher Premium attendees yet
										</p>
									) : (
										<div className='space-y-3'>
											{researcherPremiumAttendees.map((attendee) => {
												const canSendInvite =
													!attendee.preConferenceDeclinedDuringReg &&
													!attendee.preConferenceQrCode &&
													!attendee.wantsPreConference &&
													!attendee.preConferenceInviteSent;
												return (
													<div
														key={attendee._id}
														className='border rounded-lg p-4 flex items-center justify-between'
													>
														<div className='flex-1'>
															<p className='font-medium text-zinc-900'>
																{attendee.name}
															</p>
															<p className='text-sm text-zinc-500'>
																{attendee.email}
															</p>
															<div className='flex gap-2 mt-1'>
																{attendee.wantsPreConference && (
																	<span className='px-2 py-1 rounded-full text-xs bg-green-100 text-green-700'>
																		Wants Pre-Conference
																	</span>
																)}
																{attendee.preConferenceDeclinedDuringReg && (
																	<span className='px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700'>
																		Declined During Registration
																	</span>
																)}
																{attendee.preConferenceQrCode && (
																	<span className='px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700'>
																		Has Pre-Conference Ticket
																	</span>
																)}
																{attendee.preConferenceInviteSent &&
																	!attendee.preConferenceQrCode && (
																		<span className='px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700'>
																			Invite Sent -{" "}
																			{attendee.preConferenceInviteResponse ||
																				"Pending"}
																		</span>
																	)}
															</div>
														</div>
														<div className='flex gap-2'>
															<Button
																variant='outline'
																onClick={() => {
																	setSelectedAttendee(attendee);
																	setIsModalOpen(true);
																}}
															>
																View Details
															</Button>
															{canSendInvite && (
																<Button
																	onClick={() =>
																		setConfirmState({
																			open: true,
																			action: "sendPreConferenceInvite",
																			attendee,
																		})
																	}
																	className='text-purple-600 border-purple-300 hover:bg-purple-50'
																>
																	Send Pre-Conference Invite
																</Button>
															)}
														</div>
													</div>
												);
											})}
										</div>
									)}
								</div>
							)}

							{preConferenceSubTab === "referral" && (
								<div>
									{loading ? (
										<p className='text-zinc-500'>Loading...</p>
									) : attendeesResult.data.filter((a) => a.referralCode)
											.length === 0 ? (
										<p className='text-zinc-500'>
											No attendees with referral codes yet
										</p>
									) : (
										<div className='space-y-3'>
											{attendeesResult.data
												.filter((a) => a.referralCode)
												.map((attendee) => (
													<div
														key={attendee._id}
														className='border rounded-lg p-4 flex items-center justify-between'
													>
														<div className='flex-1'>
															<p className='font-medium text-zinc-900'>
																{attendee.name}
															</p>
															<p className='text-sm text-zinc-500'>
																{attendee.email}
															</p>
															<p className='text-xs text-zinc-400 mt-1'>
																{attendee.ticketType} • {attendee.paymentStatus}
																<span className='ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium'>
																	Referral: {attendee.referralCode}
																</span>
															</p>
														</div>
														<Button
															variant='outline'
															onClick={() => {
																setSelectedAttendee(attendee);
																setIsModalOpen(true);
															}}
														>
															View Details
														</Button>
													</div>
												))}
										</div>
									)}
								</div>
							)}

							{preConferenceSubTab === "all" && (
								<div>
									{loading ? (
										<p className='text-zinc-500'>Loading...</p>
									) : attendeesResult.data.length === 0 ? (
										<p className='text-zinc-500'>No attendees yet</p>
									) : (
										<>
											<div className='space-y-3'>
												{attendeesResult.data.map((attendee) => (
													<div
														key={attendee._id}
														className='border rounded-lg p-4 flex items-center justify-between'
													>
														<div className='flex-1'>
															<p className='font-medium text-zinc-900'>
																{attendee.name}
															</p>
															<p className='text-sm text-zinc-500'>
																{attendee.email}
															</p>
															<p className='text-xs text-zinc-400 mt-1'>
																{attendee.ticketType} • {attendee.paymentStatus}
															</p>
														</div>
														<Button
															variant='outline'
															onClick={() => {
																setSelectedAttendee(attendee);
																setIsModalOpen(true);
															}}
														>
															View Details
														</Button>
													</div>
												))}
											</div>
											<PaginationControls />
										</>
									)}
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
