import { Schema, models, model, type Document, type Model } from "mongoose";

export interface ISharedVideo extends Document {
  shareId: string;
  workspaceId: string;
  ownerId?: string;
  videoUrl: string;
  title: string;
  captions?: string;
  transcript?: string;
  aspectRatio?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SharedVideoSchema = new Schema<ISharedVideo>(
  {
    shareId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    workspaceId: {
      type: String,
      required: true,
    },
    ownerId: {
      type: String,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    captions: {
      type: String,
    },
    transcript: {
      type: String,
    },
    aspectRatio: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export const SharedVideo: Model<ISharedVideo> =
  (models.SharedVideo as Model<ISharedVideo>) || model<ISharedVideo>("SharedVideo", SharedVideoSchema);
