import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITransaction extends Document {
  agentId: Types.ObjectId;
  userId?: Types.ObjectId; // Optional, set when user claims
  weightInGrams: number;
  pointsAwarded: number;
  status: 'pending' | 'claimed';
  createdAt: Date;
  claimedAt?: Date;
}

const TransactionSchema: Schema<ITransaction> = new Schema(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    weightInGrams: {
      type: Number,
      required: true,
    },
    pointsAwarded: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'claimed'],
      default: 'pending',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    claimedAt: {
      type: Date,
    },
  },
  {
    timestamps: false,
  }
);

TransactionSchema.index({ agentId: 1, status: 1 });
TransactionSchema.index({ userId: 1, status: 1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema, 'Transactions');
