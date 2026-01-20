import mongoose, { Document, Schema } from 'mongoose';

export type ScanStatus = 'success' | 'already_scanned' | 'invalid';
export type ScanSource = 'qr' | 'manual';

export interface IScanLog extends Document {
  agent: Schema.Types.ObjectId;
  attendee?: Schema.Types.ObjectId;

  scanStatus: ScanStatus;
  scanSource: ScanSource;
  sessionType?: 'pre-conference' | 'main-conference';

  attendeeName?: string;
  attendeeEmail?: string;
  ticketType?: string;

  message?: string;
  details?: any;

  qrCodeHash?: string;
  qrCodeSuffix?: string;

  scannedAt: Date;
}

const scanLogSchema = new Schema<IScanLog>(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    attendee: { type: Schema.Types.ObjectId, ref: 'User', required: false, index: true },

    scanStatus: {
      type: String,
      enum: ['success', 'already_scanned', 'invalid'],
      required: true,
      index: true,
    },
    scanSource: {
      type: String,
      enum: ['qr', 'manual'],
      required: true,
      index: true,
    },
    sessionType: {
      type: String,
      enum: ['pre-conference', 'main-conference'],
      required: false,
      index: true,
    },

    attendeeName: { type: String, required: false },
    attendeeEmail: { type: String, required: false },
    ticketType: { type: String, required: false },

    message: { type: String, required: false },
    details: { type: Schema.Types.Mixed, required: false },

    qrCodeHash: { type: String, required: false, index: true },
    qrCodeSuffix: { type: String, required: false },

    scannedAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
  }
);

const ScanLog = mongoose.models.ScanLog || mongoose.model<IScanLog>('ScanLog', scanLogSchema);

export default ScanLog;
