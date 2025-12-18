import { Schema, models, model, type Document, type Model, Types } from "mongoose";

export interface IWorkspace extends Document {
  ownerId: Types.ObjectId;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  defaultStyle?: string;
  defaultAspectRatio?: string;
  defaultRecipe?: string;
  videoCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    logoUrl: {
      type: String,
    },
    primaryColor: {
      type: String,
    },
    secondaryColor: {
      type: String,
    },
    defaultStyle: {
      type: String,
    },
    defaultAspectRatio: {
      type: String,
    },
    defaultRecipe: {
      type: String,
    },
    videoCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export const Workspace: Model<IWorkspace> =
  (models.Workspace as Model<IWorkspace>) || model<IWorkspace>("Workspace", WorkspaceSchema);
