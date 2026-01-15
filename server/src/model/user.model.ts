import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// User roles in the system
export enum UserRole {
  ADMIN = 'admin',
  AGENT = 'agent',
  USER = 'user',
}

export enum TicketType {
  STUDENT = 'Student Pass',
  RESEARCHER_STANDARD = 'Researcher Standard',
  RESEARCHER_PREMIUM = 'Researcher Premium',
  LECTURER_PREMIUM = 'Lecturer Premium',
}

export enum PaymentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  DECLINED = 'declined',
}

export enum CheckInStatus {
  NOT_CHECKED_IN = 'not-checked-in',
  CHECKED_IN = 'checked-in',
}

// User interface extending Mongoose Document
export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  isActive: boolean;
  ticketsent?: boolean;
  refreshToken?: string;
  inviteToken?: string;
  inviteTokenExpires?: Date;
  lastLogin?: Date;
  createdAt: Date;
  phoneNumber?: string;
  ticketType?: TicketType;
  designation?: string;
  department?: string;
  qrCode?: string;
  paymentStatus: PaymentStatus;
  paymentProof?: string;
  originalFilename?: string;
  fileSize?: number;
  fileType?: string;
  checkInStatus: CheckInStatus;
  checkedInAt?: Date;
  checkedInBy?: Schema.Types.ObjectId;
  preConferenceQrCode?: string;
  mainConferenceQrCode?: string;
  preConferenceCheckInStatus?: CheckInStatus;
  preConferenceCheckedInAt?: Date;
  preConferenceCheckedInBy?: Schema.Types.ObjectId;
  mainConferenceCheckInStatus?: CheckInStatus;
  mainConferenceCheckedInAt?: Date;
  mainConferenceCheckedInBy?: Schema.Types.ObjectId;
  referralCode?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// User Schema Definition
const UserSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, 'Name is required'],
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
    phoneNumber: {
      type: String,
      trim: true,
    },
    ticketType: {
      type: String,
      enum: Object.values(TicketType),
    },
    preConferenceQrCode: { type: String },
    preConferenceCheckInStatus: {
      type: String,
      enum: Object.values(CheckInStatus),
      default: CheckInStatus.NOT_CHECKED_IN,
    },
    preConferenceCheckedInAt: { type: Date },
    preConferenceCheckedInBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    mainConferenceQrCode: { type: String },
    mainConferenceCheckInStatus: {
      type: String,
      enum: Object.values(CheckInStatus),
      default: CheckInStatus.NOT_CHECKED_IN,
    },
    mainConferenceCheckedInAt: { type: Date },
    mainConferenceCheckedInBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    designation: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    qrCode: {
      type: String,
    },
    referralCode: {
      type: String,
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    paymentProof: {
      type: String,
    },
    originalFilename: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    fileType: {
      type: String,
    },
    checkInStatus: {
      type: String,
      enum: Object.values(CheckInStatus),
      default: CheckInStatus.NOT_CHECKED_IN,
    },
    checkedInAt: {
      type: Date,
    },

    checkedInBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: false, // Using custom createdAt field
  }
);

UserSchema.index({ role: 1, isActive: 1 });

UserSchema.pre<IUser>('save', async function (next) {
  if (this.isModified('password') && this.password) {
    // Check if password is set and modified
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
