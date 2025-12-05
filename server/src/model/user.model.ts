import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

// User roles in the system
export enum UserRole {
  ADMIN = 'admin',
  AGENT = 'agent',
  USER = 'user',
}

// User interface extending Mongoose Document
export interface IUser extends Document {
  name?: string; // Made optional as some users might be invited with only email
  email: string;
  password?: string;
  role: UserRole;
  isActive: boolean;
  refreshToken?: string;
  inviteToken?: string;
  inviteTokenExpires?: Date;
  lastLogin?: Date;
  createdAt: Date;
  wallet: {
    balance: number;
  };
  agentProfile?: {
    allocatedFunds: number;
    manager?: Types.ObjectId; // Optional, can be empty if not managed by an admin
  };
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// User Schema Definition
const UserSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
      unique: true, // Ensure email is unique
    },
    password: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    isActive: {
      type: Boolean,
      default: true, // New users are active by default
    },
    refreshToken: {
      type: String,
      select: false,
    },
    inviteToken: {
      type: String,
    },
    inviteTokenExpires: {
      type: Date,
    },
    lastLogin: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    wallet: {
      balance: {
        type: Number,
        default: 0,
      },
    },
    agentProfile: {
      allocatedFunds: {
        type: Number,
        default: 0,
      },
      manager: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    },
  },
  {
    timestamps: false, // Using custom createdAt field
  }
);

UserSchema.index({ role: 1, isActive: 1 });

UserSchema.pre<IUser>('save', async function (next) {
  if (this.isModified('password') && this.password) { // Check if password is set and modified
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema, 'Users');