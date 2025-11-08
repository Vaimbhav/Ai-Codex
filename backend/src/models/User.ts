import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserPreferences {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: boolean;
    contextEnabled: boolean;
    streamingEnabled: boolean;
}

export interface IUser extends Document {
    email: string;
    password: string;
    name: string;
    preferences: IUserPreferences;
    apiKey?: string;
    isEmailVerified: boolean;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    toJSON(): Record<string, unknown>;
}

const userPreferencesSchema = new Schema<IUserPreferences>({
    theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system'
    },
    language: {
        type: String,
        default: 'en'
    },
    notifications: {
        type: Boolean,
        default: true
    },
    contextEnabled: {
        type: Boolean,
        default: true
    },
    streamingEnabled: {
        type: Boolean,
        default: true
    }
});

const userSchema = new Schema<IUser>({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false // Don't include password in queries by default
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [50, 'Name cannot be more than 50 characters']
    },
    preferences: {
        type: userPreferencesSchema,
        default: () => ({})
    },
    apiKey: {
        type: String,
        select: false // Don't include API key in queries by default
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    resetPasswordToken: {
        type: String,
        select: false
    },
    resetPasswordExpires: {
        type: Date,
        select: false
    }
}, {
    timestamps: true,
    toJSON: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transform: function (doc: any, ret: any) {
            delete ret.password;
            delete ret.apiKey;
            delete ret.resetPasswordToken;
            delete ret.resetPasswordExpires;
            delete ret.__v;
            return ret;
        }
    }
});

// Index for faster queries (email index is created automatically by unique: true)
userSchema.index({ resetPasswordToken: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error: unknown) {
        next(error as Error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

export const User = mongoose.model<IUser>('User', userSchema);