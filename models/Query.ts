import mongoose from 'mongoose';

import {
    MercariItem,
    MercariSearchCondition
} from '../mercari/types';
export interface IQuery extends mongoose.Document {
    userId: string;
    name: string;
    service: string; // e.g., 'mercari'
    searchParams: MercariSearchCondition;
    isTracked: boolean;
    lastRun: Date;
    lastResults: MercariItem[];
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
        lastResults: [{ type: Object }],
    },
    { timestamps: true }
);

export default mongoose.model<IQuery>('Query', QuerySchema);