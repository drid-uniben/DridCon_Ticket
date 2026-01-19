import crypto from 'crypto';
import ScanLog from '../model/scanLog.model';
import User from '../model/user.model';
import logger from '../utils/logger';

type SessionType = 'pre-conference' | 'main-conference';
type ScanStatus = 'success' | 'already_scanned' | 'invalid';
type ScanSource = 'qr' | 'manual';

const hashQrCode = (qrCode?: string) => {
  if (!qrCode) return undefined;
  return crypto.createHash('sha256').update(qrCode).digest('hex');
};

const qrSuffix = (qrCode?: string) => {
  if (!qrCode) return undefined;
  return qrCode.length <= 8 ? qrCode : qrCode.slice(-8);
};

export const recordScanAttempt = async (params: {
  agentId: any;
  scanSource: ScanSource;
  scanStatus: ScanStatus;
  sessionType?: SessionType;
  attendee?: any;
  message?: string;
  details?: any;
  qrCode?: string;
}) => {
  try {
    await ScanLog.create({
      agent: params.agentId,
      attendee: params.attendee?._id,
      scanSource: params.scanSource,
      scanStatus: params.scanStatus,
      sessionType: params.sessionType,
      attendeeName: params.attendee?.name,
      attendeeEmail: params.attendee?.email,
      ticketType: params.attendee?.ticketType,
      message: params.message,
      details: params.details,
      qrCodeHash: hashQrCode(params.qrCode),
      qrCodeSuffix: qrSuffix(params.qrCode),
      scannedAt: new Date(),
    });
  } catch (err) {
    logger.error('Failed to record scan attempt', err);
  }
};

export const getScanHistoryDataForActor = async (
  actorId: any,
  options?: { limit?: number }
) => {
  const limit = Math.max(1, Math.min(1000, options?.limit ?? 200));

  const logs = await ScanLog.find({ agent: actorId })
    .sort({ scannedAt: -1 })
    .limit(limit)
    .lean();

  const logHistory = logs.map((log: any) => ({
    _id: log._id,
    name: log.attendeeName || 'Unknown',
    email: log.attendeeEmail || '',
    ticketType: log.ticketType || '',
    scannedAt: log.scannedAt,
    scanStatus: log.scanStatus,
    scanSource: log.scanSource,
    message: log.message,
    details: log.details,
    sessionType: log.sessionType,
  }));

  // Backwards-compatible: include older successful check-ins (before ScanLog existed).
  const oldestLoggedAt = logs.length > 0 ? logs[logs.length - 1].scannedAt : undefined;

  const usersCheckedInByActor = await User.find({
    $or: [
      { checkedInBy: actorId },
      { preConferenceCheckedInBy: actorId },
      { mainConferenceCheckedInBy: actorId },
    ],
  })
    .select(
      [
        'name',
        'email',
        'ticketType',
        'checkedInAt',
        'checkedInBy',
        'preConferenceCheckedInAt',
        'preConferenceCheckedInBy',
        'mainConferenceCheckedInAt',
        'mainConferenceCheckedInBy',
      ].join(' ')
    )
    .sort({ updatedAt: -1 })
    .lean();

  const isSameAgent = (checkedInBy: any) => {
    if (!checkedInBy || !actorId) return false;
    const checkedInById = checkedInBy?._id ?? checkedInBy;
    return checkedInById?.toString?.() === actorId.toString();
  };

  const history: any[] = [];

  usersCheckedInByActor.forEach((user: any) => {
    if (isSameAgent(user.checkedInBy)) {
      history.push({
        _id: `${user._id}-main-legacy`,
        name: user.name,
        email: user.email,
        ticketType: user.ticketType,
        scannedAt: user.checkedInAt,
        scanStatus: 'success',
        scanSource: 'qr',
        sessionType: 'main-conference',
      });
    }

    if (isSameAgent(user.preConferenceCheckedInBy)) {
      history.push({
        _id: `${user._id}-preconf`,
        name: user.name,
        email: user.email,
        ticketType: user.ticketType,
        scannedAt: user.preConferenceCheckedInAt,
        scanStatus: 'success',
        scanSource: 'qr',
        sessionType: 'pre-conference',
      });
    }

    if (isSameAgent(user.mainConferenceCheckedInBy) && !isSameAgent(user.checkedInBy)) {
      history.push({
        _id: `${user._id}-main-premium`,
        name: user.name,
        email: user.email,
        ticketType: user.ticketType,
        scannedAt: user.mainConferenceCheckedInAt,
        scanStatus: 'success',
        scanSource: 'qr',
        sessionType: 'main-conference',
      });
    }
  });

  history.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());

  const legacyHistory = oldestLoggedAt ? history.filter((h) => h.scannedAt && new Date(h.scannedAt) < new Date(oldestLoggedAt)) : history;

  const combinedHistory = [...logHistory, ...legacyHistory].sort(
    (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
  );

  return {
    history: combinedHistory,
    stats: {
      totalScans: combinedHistory.length,
      successfulCheckIns: combinedHistory.filter((item) => item.scanStatus === 'success').length,
      successfulManualCheckIns: combinedHistory.filter(
        (item) => item.scanStatus === 'success' && item.scanSource === 'manual'
      ).length,
      successfulQrScans: combinedHistory.filter(
        (item) => item.scanStatus === 'success' && item.scanSource === 'qr'
      ).length,
    },
  };
};

// Backwards-compatible name (used by agent route)
export const getAgentScanHistoryData = (agentId: any) => getScanHistoryDataForActor(agentId);

export const getLatestSuccessfulCheckInSourcesForAttendees = async (attendeeIds: any[]) => {
  if (!attendeeIds || attendeeIds.length === 0) return new Map<string, any>();

  const rows = await ScanLog.aggregate([
    {
      $match: {
        attendee: { $in: attendeeIds },
        scanStatus: 'success',
        sessionType: { $in: ['pre-conference', 'main-conference'] },
      },
    },
    { $sort: { scannedAt: -1 } },
    {
      $group: {
        _id: { attendee: '$attendee', sessionType: '$sessionType' },
        scanSource: { $first: '$scanSource' },
        actor: { $first: '$agent' },
        scannedAt: { $first: '$scannedAt' },
      },
    },
  ]);

  const map = new Map<string, any>();
  rows.forEach((r: any) => {
    const attendeeId = r._id?.attendee?.toString?.() ?? String(r._id?.attendee);
    const sessionType = r._id?.sessionType;
    map.set(`${attendeeId}:${sessionType}`, {
      scanSource: r.scanSource,
      actor: r.actor,
      scannedAt: r.scannedAt,
    });
  });
  return map;
};
