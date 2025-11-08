import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
}

export interface IChatSession extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    title: string;
    messages: IMessage[];
    lastMessage: string;
    timestamp: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
    id: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const ChatSessionSchema = new Schema<IChatSession>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        default: 'New Chat',
        maxlength: 100
    },
    messages: [MessageSchema],
    lastMessage: {
        type: String,
        default: ''
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (_doc, ret) {
            ret.id = ret._id.toString();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _id, __v, ...cleanRet } = ret;
            return { ...cleanRet, id: ret.id };
        }
    }
});

// Index for efficient querying
ChatSessionSchema.index({ userId: 1, timestamp: -1 });
ChatSessionSchema.index({ userId: 1, isActive: 1 });

export const ChatSession = mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);