import mongoose, { Schema, Document } from 'mongoose';

export interface IFile extends Document {
    name: string;
    originalName: string;
    path: string;
    size: number;
    mimeType: string;
    language: string;
    content: string;
    chunks: ICodeChunk[];
    dependencies: string[];
    exports: string[];
    userId: string;
    sessionId?: string;
    uploadedAt: Date;
}

export interface ICodeChunk {
    id: string;
    content: string;
    startLine: number;
    endLine: number;
    type: 'function' | 'class' | 'interface' | 'block' | 'other';
    embedding?: number[];
}

const CodeChunkSchema = new Schema<ICodeChunk>({
    id: { type: String, required: true },
    content: { type: String, required: true },
    startLine: { type: Number, required: true },
    endLine: { type: Number, required: true },
    type: {
        type: String,
        enum: ['function', 'class', 'interface', 'block', 'other'],
        default: 'other'
    },
    embedding: [{ type: Number }]
});

const FileSchema: Schema = new Schema({
    name: { type: String, required: true },
    originalName: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    language: { type: String, required: true },
    content: { type: String, required: true },
    chunks: [CodeChunkSchema],
    dependencies: [{ type: String }],
    exports: [{ type: String }],
    userId: { type: String, required: true },
    sessionId: { type: String },
    uploadedAt: { type: Date, default: Date.now }
});

export const File = mongoose.model<IFile>('File', FileSchema);