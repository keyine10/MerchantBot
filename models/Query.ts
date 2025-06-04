import mongoose from 'mongoose';

import {
    MercariSearchCondition
} from '../mercari/types';
export interface IQuery extends mongoose.Document {
    userId: string;
    name: string;
    service: string; // e.g., 'mercari'
    searchParams: Partial<MercariSearchCondition>;
    isTracked: boolean;
    lastRun: Date;
    lastResults: string[];
    createdAt: Date;
    updatedAt: Date;
}

const QuerySchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        name: { type: String, required: true },
        searchParams: { type: Object, required: true },
        isTracked: { type: Boolean, default: false },
        lastRun: { type: Date, default: Date.now },
        lastResults: [{ type: String }], // Array of item IDs from the last search
    },
    { timestamps: true }
);

// Create a compound index for userId and name to ensure unique queries per user
QuerySchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model<IQuery>('Query', QuerySchema);