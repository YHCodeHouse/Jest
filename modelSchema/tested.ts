import { Model } from "../models/api/api";
import { Nullable } from "../models/utils/type";

interface TestedCompositeKeyValue {
  hospitalId: string;
  id: string;
}

interface Tested extends TestedCompositeKeyValue {
  text: string;
  text2: string;
}

const args = {
  hospitalId: { type: String, required: true },
  id: { type: String, required: true },
  text: { type: String },
  text2: { type: String }
};

const index: (keyof Tested)[][] = [["hospitalId", "text"]];

const model = new Model<TestedCompositeKeyValue, Tested>("tested", args);
model.addIndex(index);

export default model;
