import mongoose, { ObjectId } from "mongoose";

import { MercariItem, MercariSearchCondition } from "../services/mercari/types";

export interface IQuery extends mongoose.Document {
  _id: ObjectId;
  userId: string;
  name: string;
  service: string; // e.g., 'mercari'
  searchParams: MercariSearchCondition;
  isTracked: boolean;
  lastRun: Date;
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
  },
  { timestamps: true }
);

// Create compound unique index on userId and searchParams.keyword
QuerySchema.index({ userId: 1, 'searchParams.keyword': 1 }, { unique: true });

export default mongoose.model<IQuery>("Query", QuerySchema);
