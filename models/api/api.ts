import mongoose, {
  model,
  Model as MongooseModel,
  Schema,
  PaginateModel
} from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { Nullable, ValueNulable } from "../utils/type";

export async function connectDb() {
  var mongoDB =
    "mongodb+srv://youngho:qweqwe@migration.ny7kv.mongodb.net/test?authSource=admin&replicaSet=atlas-tiqdjc-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true";

  console.log("dbconnection:", mongoDB);
  return await mongoose
    .connect(mongoDB, {
      socketTimeoutMS: 90000
    })
    .then(res => {
      console.log("successfully connected to the database");
      return res;
    })
    .catch(e => {
      console.log("error connecting to the database: ", e);
    });
}
type Type =
  | StringConstructor
  | NumberConstructor
  | Boolean
  | DateConstructor
  | ObjectConstructor
  | ArrayConstructor;
type Args = Type | { type: Type | Args; required?: Boolean };
type CompareKey = "$gte" | "$lte";
type InputDate = { [k in CompareKey]?: Date };
interface Page {
  offset?: number | null;
  limit?: number | null;
}
interface Sort {
  indexKey?: string | null;
  order?: boolean | null;
}

type Conditions =
  | string
  | InputDate
  | { $in: string }
  | { $regex: string; $options: "i" }
  | { $ne: string };

interface Options {
  limit?: number;
  page?: number;
  sort?: Record<string, 1 | -1>;
}

export class Model<TCompositeKeyValue, TSchema extends TCompositeKeyValue> {
  model: PaginateModel<TSchema, {}, {}, {}>;
  schema: Schema<any, MongooseModel<TSchema, {}, {}, {}>, any, any>;
  key: (keyof TCompositeKeyValue)[];
  index: string[];
  log: () => void;

  constructor(
    name: string,
    args: Record<keyof TSchema, any>,
    log?: () => void
  ) {
    this.schema = new mongoose.Schema(args as Record<string, any>);
    this.schema.plugin(mongoosePaginate);

    this.model = model<TSchema, PaginateModel<TSchema>>(
      name,
      this.schema,
      name
    );

    var keyList = <(keyof TCompositeKeyValue)[]>[];

    const index = <Record<keyof TCompositeKeyValue, 1>>{};
    for (const key of Object.keys(args)) {
      if ("required" in args[key as keyof TSchema]) {
        keyList.push(key as keyof TCompositeKeyValue);
        index[key as keyof TCompositeKeyValue] = 1;
      }
    }

    this.key = keyList;
    const indexName = keyList.join("-");
    this.schema.index(index, { unique: true, name: indexName });
    this.index = [indexName];

    if (log) this.log = log;
    else this.log = () => {};
  }

  setLog = (log: () => void) => {
    this.log = log;
  };

  getSchemaType = (name: string) => {
    const value = this.schema.path(name);
    const type = this.schema.pathType(name);

    if (type === "nested") {
      return "Map";
    }

    if (value instanceof Schema.Types.String) return "String";
    if (value instanceof Schema.Types.Number) return "Number";
    if (value instanceof Schema.Types.Date) return "Date";
    if (value instanceof Schema.Types.Boolean) return "Boolean";
    if (value instanceof Schema.Types.Array) return "List";
    return "Unknown";
  };

  getType(object: Object) {
    if (object.constructor === Object) return "Map";
    if (object.constructor === Array) return "List";
    if (object.constructor === Number) return "Number";
    if (object.constructor === String) return "String";
    if (object.constructor === Boolean) return "Boolean";
    return "Unknown";
  }

  pickObjectByKeys<TArgs extends TCompositeKeyValue>(
    obj: TArgs
  ): TCompositeKeyValue {
    let result = {} as TCompositeKeyValue;
    console.log(this.key);
    for (const key of this.key) {
      if (key in obj) {
        result[key] = obj[key];
      } else {
        throw "error";
      }
    }
    return result;
  }

  addIndex<TSchemaKey extends keyof TSchema>(index: TSchemaKey[][]) {
    index.forEach(el => {
      const convert = <Record<TSchemaKey, 1>>{};
      el.forEach(key => {
        convert[key] = 1;
      });

      const indexName = el.join("-");
      this.schema.index(convert, { unique: false, name: indexName });
      this.index.push(indexName);
    });
  }

  async getIndex() {
    const ret = await this.model.listIndexes();
    return ret
      .filter(el => el.name !== "_id_")
      .map(el => {
        return el.name;
      });
  }

  async get(args: TCompositeKeyValue) {
    const ret = await this.model.findOne(args, { _id: 0 });
    if (!ret) {
      throw "No, geted!";
    }
    return ret;
  }

  async create(args: TSchema) {
    const ret = await this.model.create(args);
    return ret;
  }

  // async update(args: TSchema) {
  async update(
    args: ValueNulable<Omit<TSchema, keyof TCompositeKeyValue>> &
      TCompositeKeyValue
  ) {
    const keyValue = this.pickObjectByKeys(args);
    const ret = await this.model.findOneAndUpdate(keyValue, args, {
      new: true
    });

    if (!ret) {
      throw "No, updated!";
    }

    return ret;
  }

  async batchPut(
    args: Array<
      ValueNulable<Omit<TSchema, keyof TCompositeKeyValue>> & TCompositeKeyValue
    >
  ) {
    console.log(this.pickObjectByKeys(args[0]));
    return await this.model
      .bulkWrite(
        args.map(item => {
          return {
            updateOne: {
              filter: this.pickObjectByKeys(item),
              update: JSON.parse(JSON.stringify(item)),
              upsert: true
            }
          };
        })
      )
      .then(async result => {
        return result.ok ? true : false;
      });
  }

  async remove(args: TCompositeKeyValue) {
    const keyValue = this.pickObjectByKeys(args);
    const ret = await this.model.findOneAndDelete(keyValue);

    if (!ret) {
      throw "No, deleted!";
    }

    return ret;
  }

  convertFilter(
    args: Record<keyof TSchema, any>,
    exact: boolean | null,
    comparison: string | null
  ) {
    const conditions = <Record<keyof TSchema, Conditions>>{};

    if (args) {
      Object.keys(args).map(arg => {
        const key = arg as keyof TSchema;

        const retType = this.getSchemaType(arg);
        const argType = this.getType(args[key]);

        if (retType === "String") {
          if (argType === "List") {
            conditions[key] = { $in: args[key] };
          } else {
            if (exact) {
              conditions[key] = args[key];
            } else {
              conditions[key] = {
                $regex: `${args[key]}`,
                $options: "i"
              };
            }
          }
        } else if (retType === "Number") {
          conditions[key] = args[key];
        } else if (retType === "Boolean") {
          conditions[key] = args[key];
        } else if (retType === "Date") {
          conditions[key] = <InputDate>{};
          if (args[key].begin) {
            (conditions[key] as InputDate)[`$gte`] = new Date(args[key].begin);
          }
          if (args[key].end) {
            (conditions[key] as InputDate)[`$lte`] = new Date(args[key].end);
          }
        } else if (retType === "Map") {
        } else if (retType === "List") {
          if (["String", "Number"].includes(argType)) {
            if (args[key][0] === "!") {
              conditions[key] = { $ne: args[key].substring(1) };
            } else {
              conditions[key] = args[key];
            }
          }
        }
      });
    }

    if (comparison === "or") {
      const arr = <Record<keyof TSchema, Conditions>[]>[];
      Object.entries(conditions).forEach(obj => {
        const temp = <Record<keyof TSchema, Conditions>>{ [obj[0]]: obj[1] };
        arr.push(temp);
      });
      return { $or: arr };
    }

    return conditions;
  }

  async find({
    args,
    exact = true,
    comparison = "and",
    sort
  }: {
    args?: any | null;
    exact?: boolean | null;
    comparison?: string | null;
    sort?: { indexKey?: string | null; order?: boolean | null } | null;
  }) {
    const filter = this.convertFilter(args, exact, comparison);

    const ret = await this.model.find(filter);
    // .then(res => res.map(el => el.toObject()));
    return ret;
  }

  async findPagination({
    args,
    exact = true,
    comparison = "and",
    page,
    sort
  }: {
    args?: Nullable<any>;
    exact?: Nullable<boolean>;
    comparison?: Nullable<string>;
    page?: Nullable<Page>;
    sort?: Nullable<Sort>;
  }) {
    if (sort?.indexKey) {
      if (this.index.includes(sort.indexKey)) {
      } else {
        throw "No, IndexKey";
      }
    }

    const options = <Options>{};
    if (page?.limit) options.limit = page.limit;
    if (page?.offset) options.page = page.offset;

    if (sort) {
      if (sort.indexKey) {
        const arr = sort.indexKey.split("-");
        var obj = <Record<string, 1 | -1>>{};

        arr.forEach(v => {
          obj[v] = 1;
        });

        options.sort = obj;
      }
    }

    const filter = this.convertFilter(args, exact, comparison);
    const ret = await this.model.paginate(filter, options).then(res => {
      return {
        data: res.docs,
        nextPage: res.nextPage,
        totalDocs: res.totalDocs,
        totalPages: res.totalPages
      };
    });

    return ret;
  }

  async updateMany(option: {} | object, willChange: object) {
    const ret = await this.model.updateMany(option, willChange);
    return ret;
  }
}

export default connectDb;
