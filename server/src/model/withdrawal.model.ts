import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IWithdrawal extends Document {
  userId: Types.ObjectId;
  pointsRedeemed: number;
  amountNaira: number;
  bankDetails: {
    accountName: string;
    accountNumber: string;
    bankName: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  processedAt?: Date;
  adminId?: Types.ObjectId; // Admin who processed the request
}

const WithdrawalSchema: Schema<IWithdrawal> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pointsRedeemed: {
      type: Number,
      required: true,
    },
    amountNaira: {
      type: Number,
      required: true,
    },
    bankDetails: {
      accountName: { type: String, required: true },
      accountNumber: { type: String, required: true },
      bankName: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: false,
  }
);

WithdrawalSchema.index({ userId: 1, status: 1 });
WithdrawalSchema.index({ adminId: 1, status: 1 });

export default mongoose.model<IWithdrawal>('Withdrawal', WithdrawalSchema, 'Withdrawals');
